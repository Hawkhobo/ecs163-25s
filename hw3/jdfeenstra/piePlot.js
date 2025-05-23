export function createPie(svg, subjectVoteData, histData, allKeywordCounts, options) {
  const { radius, left, top, selectedKeyword, onPieClick, selectedKeywordColor } = options; // <--- Capture new option

  const g = svg.append("g")
      .attr("class", "pie-group")
      .attr("transform", `translate(${left + radius}, ${top + radius})`);

  const processedPieData = subjectVoteData;

  const pie = d3.pie()
    .value(d => d.totalVotes);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  let colorScale;
  // --- NEW/CHANGED LOGIC FOR COLOR SCALE ---
  if (selectedKeyword && selectedKeywordColor) {
      // If a keyword is selected and its color is explicitly passed, use that color for all slices
      // We create a scale whose range is ONLY that one color.
      colorScale = d3.scaleOrdinal().range([selectedKeywordColor]);
  } else {
      // Otherwise (no keyword selected or color not passed), use a default D3 scheme
      colorScale = d3.scaleOrdinal()
        .domain(processedPieData.map(d => d.topKeyword)) // Domain mapped to the keywords in the pie data
        .range(d3.schemeCategory10); // Use the default color scheme
  }
  // --- END NEW/CHANGED LOGIC ---


  const tooltip = d3.select("body").select(".pie-tooltip");
  if (tooltip.empty()) {
      d3.select("body").append("div")
          .attr("class", "pie-tooltip tooltip")
          .style("opacity", 0)
          .style("position", "absolute")
          .style("background-color", "white")
          .style("border", "solid")
          .style("border-width", "1px")
          .style("border-radius", "5px")
          .style("padding", "8px")
          .style("pointer-events", "none");
  }


  g.selectAll(".arc")
    .data(pie(processedPieData))
    .enter().append("path")
    .attr("d", arc)
    .attr("fill", d => colorScale(d.data.topKeyword)) // Use the determined color scale
    .attr("class", "arc")
    .attr("stroke", "black")
    .attr("stroke-width", 1)
    .on("mouseover", function(event, d) {
      d3.select(this).raise();
      d3.select(this).style("cursor", "pointer");
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(`<strong>${d.data.subject}</strong><br/>
                    Total Votes: <strong>${d.data.totalVotes}</strong><br/>
                    Status: ${d.data.passFail}<br/>
                    Top Keyword: ${d.data.topKeyword || 'N/A'}`)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");

      d3.select(this)
        .style("stroke-width", 2)
        .style("stroke", "darkblue");
    })
    .on("mouseout", function(event, d) {
      d3.select(this).style("cursor", "default");
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);

      d3.select(this)
        .style("stroke-width", 1)
        .style("stroke", "black");
    });

  g.on("click", function() {
    if (onPieClick) {
        onPieClick();
    }
  });

  if (selectedKeyword) {
      g.classed("highlighted-pie", true);
  } else {
      g.classed("highlighted-pie", false);
  }

  // --- Pie Legend Rendering Logic ---
  const legendGroup = svg.select(".pie-legend");
  const legendG = legendGroup.empty() ? svg.append("g").attr("class", "pie-legend") : legendGroup;
  legendG.attr("transform", `translate(${left + radius - 700}, ${top})`);


  if (selectedKeyword) {
      // When a keyword is selected, the pie legend should display a single item for the selected keyword.
      legendG.selectAll(".legend-item")
        .data([selectedKeyword]) // Bind only the selected keyword
        .join(
          enter => enter.append("g")
            .attr("class", "legend-item")
            .attr("transform", `translate(0, 0)`) // Position single item
            .call(legendEnter => {
              legendEnter.append("rect")
                .attr("width", 18)
                .attr("height", 18)
                .attr("fill", selectedKeywordColor || "grey"); // Use the passed color
              legendEnter.append("text")
                .attr("x", 24)
                .attr("y", 9)
                .attr("dy", "0.35em")
                .text(d => d);
            }),
          update => update
            .select("rect").attr("fill", selectedKeywordColor || "grey"), // Update color
          exit => exit.remove()
        );
  } else {
      // When no keyword is selected, display the original top 25 keywords' legend
      const uniqueKeywords = [...new Set(processedPieData.map(d => d.topKeyword))];
      legendG.selectAll(".legend-item")
        .data(uniqueKeywords)
        .join(
          enter => enter.append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${i * 20})`)
            .call(legendEnter => {
              legendEnter.append("rect")
                .attr("width", 18)
                .attr("height", 18)
                .attr("fill", colorScale); // Use the default color scale
              legendEnter.append("text")
                .attr("x", 24)
                .attr("y", 9)
                .attr("dy", "0.35em")
                .text(d => d);
            }),
          update => update
            .attr("transform", (d, i) => `translate(0, ${i * 20})`)
            .select("rect").attr("fill", colorScale), // Update color
          exit => exit.remove()
        );
  }

  return g;
}

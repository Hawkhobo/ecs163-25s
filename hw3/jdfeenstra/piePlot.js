export function createPie(svg, subjectVoteData, histData, allKeywordCounts, options) {
  const { radius, left, top, selectedKeyword, onPieClick } = options;

  const g = svg.append("g")
      .attr("class", "pie-group")
      .attr("transform", `translate(${left + radius}, ${top + radius})`);

  // Prepare data for Pie Chart
  // subjectVoteData will either be the full 'subjectVotes' object (if no selectedKeyword)
  // OR the 'pieFilteredByKeyword' array (if selectedKeyword is active).
  // We need to handle both structures.

  let processedPieData;

  if (selectedKeyword) {
      // If a keyword is selected, subjectVoteData is already an array of processed objects
      processedPieData = subjectVoteData; // This is 'pieFilteredByKeyword' from processData.js
  } else {
      // If no keyword is selected, subjectVoteData is the original 'subjectVotes' object.
      // We need to convert it to an array and process it for 'topKeyword'.
      processedPieData = Object.entries(subjectVoteData)
        .sort(([, a], [, b]) => b.total - a.total)
        .map(([subject, data]) => {
          // Recalculate topKeyword here for the UNFILTERED data,
          // as processData.js calculates it only for the filtered part.
          // Or, better, ensure processData.js calculates it for *all* subjectVotes
          // when it builds the original subjectVotes object.
          // Let's assume for now that data.keywords IS available for the unfiltered case.

          let topKeyword = 'N/A';
          let bestRank = Infinity;
          // IMPORTANT: Check if data.keywords exists before calling forEach
          if (data.keywords && Array.isArray(data.keywords)) {
            data.keywords.forEach(keyword => {
              const trimmedKeyword = keyword ? keyword.trim() : null;
              if (trimmedKeyword) {
                const rankInHistogram = histData.findIndex(item => item.keyword === trimmedKeyword);
                if (rankInHistogram !== -1 && rankInHistogram < bestRank) {
                  bestRank = rankInHistogram;
                  topKeyword = trimmedKeyword;
                }
              }
            });
          }

          return {
            subject: subject,
            totalVotes: data.total,
            passFail: data.passFail,
            topKeyword: topKeyword
          };
        });
  }


  const pie = d3.pie()
    .value(d => d.totalVotes);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  let colorScale;
  if (selectedKeyword) {
      const randomColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
      colorScale = d3.scaleOrdinal().range([randomColor]);
  } else {
      colorScale = d3.scaleOrdinal()
        .domain(processedPieData.map(d => d.topKeyword)) // Use processedPieData
        .range(d3.schemeCategory10);
  }

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
    .data(pie(processedPieData)) // Use processedPieData here
    .enter().append("path")
    .attr("d", arc)
    .attr("fill", d => colorScale(d.data.topKeyword))
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
      g.classed("highlighted-pie", false); // <--- IMPORTANT: Remove class on reset
  }


  const legendGroup = svg.select(".pie-legend");
  if (legendGroup.empty()) {
      svg.append("g")
        .attr("class", "pie-legend")
        .attr("transform", `translate(${left + radius - 700}, ${top})`);
  }
  
  if (selectedKeyword) {
      legendGroup.selectAll(".legend-item").remove();
  } else {
      // Use processedPieData for the legend domain when not filtered by keyword
      const uniqueKeywords = [...new Set(processedPieData.map(d => d.topKeyword))];
      legendGroup.selectAll(".legend-item")
        .data(uniqueKeywords)
        .join(
          enter => enter.append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${i * 20})`)
            .call(legendEnter => {
              legendEnter.append("rect")
                .attr("width", 18)
                .attr("height", 18)
                .attr("fill", colorScale);
              legendEnter.append("text")
                .attr("x", 24)
                .attr("y", 9)
                .attr("dy", "0.35em")
                .text(d => d);
            }),
          update => update
            .attr("transform", (d, i) => `translate(0, ${i * 20})`)
            .select("rect").attr("fill", colorScale),
          exit => exit.remove()
        );
  }

  return g;
}

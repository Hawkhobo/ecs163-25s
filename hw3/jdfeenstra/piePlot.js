import { pieLegendXOffset, pieLegendYOffset, labelTextPosX, labelTextPosY, countTextPosX, countTextPosY, pieHeaderX, pieHeaderY} from './dimensions.js';

export function createPie(svg, subjectVoteData, histData, allKeywordCounts, options) {
  const { radius, left, top, selectedKeyword, onPieClick, selectedKeywordColor } = options;

  // Get or create the main group
  let g = svg.select(".pie-group");
  if (g.empty()) {
    g = svg.append("g")
        .attr("class", "pie-group")
        .attr("transform", `translate(${left + radius}, ${top + radius})`);
  }

  const processedPieData = subjectVoteData;

  const pie = d3.pie()
    .value(d => d.totalVotes)
    .sort(null); // Disable sorting for smoother transitions

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  let colorScale;
  if (selectedKeyword && selectedKeywordColor) {
    colorScale = d3.scaleOrdinal().range([selectedKeywordColor]);
  } else {
    colorScale = d3.scaleOrdinal()
      .domain(processedPieData.map(d => d.topKeyword))
      .range(d3.schemeCategory10);
  }

  // Create tooltip if it doesn't exist
  let tooltip = d3.select("body").select(".pie-tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body").append("div")
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

  // Create key function for data binding consistency
  const keyFunction = d => d.data.subject || d.data.topKeyword;

  // Bind data and handle enter/update/exit with transitions
  const arcs = g.selectAll(".arc")
    .data(pie(processedPieData), keyFunction);

  // Handle exiting arcs
  arcs.exit()
    .transition()
    .duration(750)
    .attrTween("d", function(d) {
      const interpolate = d3.interpolate(d, {startAngle: 0, endAngle: 0});
      return t => arc(interpolate(t));
    })
    .style("opacity", 0)
    .remove();

  // Handle entering arcs
  const arcsEnter = arcs.enter()
    .append("path")
    .attr("class", "arc")
    .attr("stroke", "black")
    .attr("stroke-width", 1)
    .style("opacity", 0)
    .attr("d", arc({startAngle: 0, endAngle: 0})); // Start from zero angle

  // Merge enter and update selections
  const arcsMerged = arcsEnter.merge(arcs);

  // Apply transitions to merged selection
  arcsMerged
    .transition()
    .duration(750)
    .ease(d3.easeElastic.period(0.8).amplitude(0.5))
    .style("opacity", 1)
    .attr("fill", d => colorScale(d.data.topKeyword))
    .attrTween("d", function(d) {
      const current = this._current || {startAngle: 0, endAngle: 0};
      const interpolate = d3.interpolate(current, d);
      this._current = d; // Store current data for next transition
      return t => arc(interpolate(t));
    })
    .on("end", function(d) {
      // Store final state for next transition
      this._current = d;
    });

  // Add event handlers to merged selection
  arcsMerged
    .on("mouseover", function(event, d) {
      d3.select(this)
        .raise()
        .style("cursor", "pointer")
        .transition()
        .duration(150)
        .style("stroke-width", 3)
        .style("stroke", "darkblue")
        .attr("transform", "scale(1.05)"); // Slight scale up on hover

      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(`<strong>${d.data.subject}</strong><br/>
                    Total Votes: <strong>${d.data.totalVotes}</strong><br/>
                    Status: ${d.data.passFail}<br/>
                    Top Keyword: ${d.data.topKeyword || 'NaN'}`)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(event, d) {
      d3.select(this)
        .style("cursor", "default")
        .transition()
        .duration(150)
        .style("stroke-width", 1)
        .style("stroke", "black")
        .attr("transform", "scale(1)"); // Return to normal size

      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });

  // Handle pie group click
  g.on("click", function() {
    if (onPieClick) {
      onPieClick();
    }
  });

  // Update pie group highlighting with transition
  if (selectedKeyword) {
    g.transition()
      .duration(300)
      .style("filter", "drop-shadow(0 0 10px rgba(0,100,200,0.5))")
      .on("end", () => g.classed("highlighted-pie", true));
  } else {
    g.transition()
      .duration(300)
      .style("filter", "none")
      .on("end", () => g.classed("highlighted-pie", false));
  }

  // update Header for pie chart transition
  const title = selectedKeyword ? `Top ${selectedKeyword} Measures by Votes` : "Top 25 Measures by Votes";
  updatePieHeader(g, title);

  // Handle legend transitions
  updateLegendWithTransitions(svg, left, top, radius, selectedKeyword, selectedKeywordColor, processedPieData, colorScale);

  // Add/update total votes display
  updateTotalVotesDisplay(svg, left, top, radius, processedPieData);

  return g;
}

function updatePieHeader(g, title) {
  let headerText = g.select(".viz-header");

  if (headerText.empty()) {
    headerText = g.append("text")
      .attr("class", "viz-header")
      .attr("x", pieHeaderX)
      .attr("y", pieHeaderY)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .style("opacity", 1)
      .text(title);
  } else {
    // Animate the title change with a fade-out, text change, then fade-in
    headerText
      .transition()
      .duration(200)
      .style("opacity", 0)
      .on("end", function() {
        d3.select(this)
          .text(title)
          .transition()
          .duration(300)
          .style("opacity", 1);
      });
  }

}

function updateLegendWithTransitions(svg, left, top, radius, selectedKeyword, selectedKeywordColor, processedPieData, colorScale) {
  let legendG = svg.select(".pie-legend");
  if (legendG.empty()) {
    legendG = svg.append("g").attr("class", "pie-legend");
  }
  
  legendG.attr("transform", `translate(${left + radius + pieLegendXOffset}, ${top + pieLegendYOffset})`);

  let legendData;
  if (selectedKeyword) {
    legendData = [selectedKeyword];
  } else {
    legendData = [...new Set(processedPieData.map(d => d.topKeyword))];
  }

  const legendItems = legendG.selectAll(".legend-item")
    .data(legendData, d => d);

  // Exit transition
  legendItems.exit()
    .transition()
    .duration(400)
    .style("opacity", 0)
    .attr("transform", (d, i) => `translate(-20, ${i * 20})`)
    .remove();

  // Enter transition
  const legendEnter = legendItems.enter()
    .append("g")
    .attr("class", "legend-item")
    .style("opacity", 0)
    .attr("transform", (d, i) => `translate(20, ${i * 20})`);

  legendEnter.append("rect")
    .attr("width", 18)
    .attr("height", 18);

  legendEnter.append("text")
    .attr("x", 24)
    .attr("y", 9)
    .attr("dy", "0.35em")
    .text(d => d);

  // Merge and update
  const legendMerged = legendEnter.merge(legendItems);

  legendMerged
    .transition()
    .duration(400)
    .delay((d, i) => i * 50) // Stagger the legend items
    .style("opacity", 1)
    .attr("transform", (d, i) => `translate(0, ${i * 20})`);

  legendMerged.select("rect")
    .transition()
    .duration(400)
    .attr("fill", d => selectedKeyword ? selectedKeywordColor : colorScale(d));
}

function updateTotalVotesDisplay(svg, left, top, radius, processedPieData) {
  // Calculate total votes
  const totalVotes = processedPieData.reduce((sum, d) => sum + d.totalVotes, 0);
  
  // Position the text to the right of the pie chart
  const textX = left + radius * 2 + 20; // 20px padding from pie edge
  const textY = top + radius - 10; // Slightly above center
  
  // Get or create the total votes groupI have a couple D3 visualizations.
  let totalVotesGroup = svg.select(".total-votes-group");
  if (totalVotesGroup.empty()) {
    totalVotesGroup = svg.append("g").attr("class", "total-votes-group");
  }
  
  // Update the label text
  let labelText = totalVotesGroup.select(".total-votes-label");
  if (labelText.empty()) {
    labelText = totalVotesGroup.append("text")
      .attr("class", "total-votes-label")
      .attr("x", textX + labelTextPosX)
      .attr("y", textY + labelTextPosY)
      .attr("text-anchor", "start")
      .style("font-family", "Arial, sans-serif")
      .style("font-size", "18px")
      .style("font-weight", "bold") .style("fill", "#333") .text("Total Votes:"); } // Update the count text with transition
  let countText = totalVotesGroup.select(".total-votes-count");
  if (countText.empty()) {
    countText = totalVotesGroup.append("text")
      .attr("class", "total-votes-count")
      .attr("x", textX + countTextPosX)
      .attr("y", textY + countTextPosY)
      .attr("text-anchor", "start")
      .style("font-family", "Arial, sans-serif")
      .style("font-size", "22px")
      .style("font-weight", "bold")
      .style("fill", "#2563eb")
      .text("0");
  }

  // Animate the number change
  countText
    .transition()
    .duration(750)
    .ease(d3.easeQuadOut)
    .tween("text", function() {
      const currentValue = +this.textContent.replace(/,/g, '') || 0;
      const interpolate = d3.interpolateNumber(currentValue, totalVotes);
      return function(t) {
        this.textContent = Math.round(interpolate(t)).toLocaleString();
      };
    });
}

export function createHist(svg, data, options) {
  const { margin, width, height, xPosition, yPosition, onBarClick, selectedKeyword } = options;

  // Add a class for easy removal by main.js
  const g = svg.append("g")
      .attr("class", "hist-group") 
      .attr("transform", `translate(${xPosition + margin.left}, ${yPosition + margin.top})`);

  const histData = Object.entries(data).map(([key, value]) => ({
    keyword: key,
    count: value
  }));
  histData.sort((a, b) => b.count - a.count);

  const xScale = d3.scaleBand()
    .domain(histData.map(d => d.keyword))
    .range([0, width])
    .padding(0.1);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(histData, d => d.count)])
    .range([0, height]);

  // Y-axis (counts) will be on the left.
  g.append("g")
    .call(d3.axisLeft(yScale));

  // Y-axis label
  g.append("text")
      .attr("class", "axis-label y-axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -30) 
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Total Keyword Counts");

  // Tooltip creation (ensure this is still here if you want tooltips)
  const tooltip = d3.select("body").select(".hist-tooltip"); // Select existing or create if not present
  if (tooltip.empty()) {
      d3.select("body").append("div")
          .attr("class", "hist-tooltip tooltip") // Add "tooltip" class for general styling if desired
          .style("opacity", 0)
          .style("position", "absolute")
          .style("background-color", "white")
          .style("border", "solid")
          .style("border-width", "1px")
          .style("border-radius", "5px")
          .style("padding", "5px")
          .style("pointer-events", "none");
  }


  g.selectAll(".bar")
    .data(histData)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", d => xScale(d.keyword))
    .attr("width", xScale.bandwidth())
    .attr("y", 0)
    .attr("height", d => yScale(d.count))
    .attr("fill", "purple")
    // --- ADD HIGHLIGHTING BASED ON selectedKeyword ---
    .classed("selected-bar", d => d.keyword === selectedKeyword) 
    // --- ADD CLICK EVENT LISTENER ---
    .on("click", function(event, d) {
        if (onBarClick) { // Ensure the callback exists
            onBarClick(d.keyword); // Notify main.js of the clicked keyword
        }
    })
    .on("mouseover", function(event, d) {
      d3.select(this).style("cursor", "pointer"); // Add pointer cursor
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(`Keyword: <strong>${d.keyword}</strong><br/>Total Count: <strong>${d.count}</strong>`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(event, d) {
      d3.select(this).style("cursor", "default"); // Reset cursor
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });

  return g;
}

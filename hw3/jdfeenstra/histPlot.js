export function createHist(svg, data, options) {
  const {margin, width, height, xPosition, yPosition } = options;

  const g = svg.append("g")
      .attr("transform", `translate(${xPosition + margin.left}, ${yPosition + margin.right})`);

  const histData = Object.entries(data).map(([key, value]) => ({
    keyword: key,
    count: value
  }));
  histData.sort((a, b) => b.count - a.count);

  const yScale = d3.scaleBand()
    .domain(histData.map(d => d.keyword))
    .range([0, height])
    .padding(0.1);

  const xScale = d3.scaleLinear()
    .domain([0, d3.max(histData, d => d.count)])
    .range([0, width]);

  g.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));

  // create a tooltip that is initially hidden
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "5px")
    .style("padding", "5px")
    .style("pointer-events", "none");

  g.selectAll(".bar")
    .data(histData)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", d => yScale(d.keyword))
    .attr("width", d => xScale(d.count))
    .attr("height", yScale.bandwidth())
    .attr("fill", "purple")
    .on("mouseover", function(event, d) {
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(`Keyword: <strong>${d.keyword}</strong><br/>Count: <strong>${d.count}</strong>`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(event, d) {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });

    return g; 
}

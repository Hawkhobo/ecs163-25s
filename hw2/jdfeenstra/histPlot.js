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
    .call(d3.axisLeft(yScale));

  g.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));

  g.selectAll(".bar")
    .data(histData)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", d => yScale(d.keyword))
    .attr("width", d => xScale(d.count))
    .attr("height", yScale.bandwidth())
    .attr("fill", "purple");

  g.selectAll(".label")
    .data(histData)
    .enter().append("text")
    .attr("class", "label")
    .attr("x", d => xScale(d.count) + 5)
    .attr("y", d => yScale(d.keyword) + yScale.bandwidth() / 2)
    .attr("dy", "0.15")
    .text(d => d.count);

  return g; 
}

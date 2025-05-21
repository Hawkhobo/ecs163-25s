export function createStream(svg, data, options) {
  const { margin, width, height, xPosition, yPosition, topKeywords } = options;
  const g = svg.append("g")
      .attr("transform", `translate(${xPosition + margin.left}, ${yPosition + margin.top})`);

  // Extract unique years from the data
  const years = Array.from(new Set(data.flatMap(d => d.years.map(y => y.year))));
  years.sort(d3.ascending); // Sort years

  // Set up scales
  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, width]);
  const y = d3.scaleLinear().range([height, 0]); // Corrected range
  const color = d3.scaleOrdinal(d3.schemeCategory10);


  // Stack the data to get the y0 and y1 values for the area generator
  const stackedDataInput = years.map(year => {
    const yearData = { year: year };
    topKeywords.forEach(keyword => {
      const keywordEntry = data.find(item => item.keyword === keyword);
      yearData[keyword] = keywordEntry?.years.find(y => y.year === year)?.count || 0;
    });
    return yearData;
  });

  const stack = d3.stack()
    .keys(topKeywords) // Use topKeywords directly as keys
    .value((d, key) => d[key] || 0); // Access count directly from the year object

  const stackedSeries = stack(stackedDataInput);

  y.domain([0, d3.max(stackedSeries.flatMap(layer => layer.map(d => d[1])))]);

  // Define the area generator for the stream graph
  const area = d3.area()
    .x(d => {
      if (d.data) {
        return x(d.data.year);
      } else {
        console.error("d.data is undefined for:", d);
        return 0; // Or some other fallback value
      }
    })  // Access year from the 'data' property
    .y0(d => y(d.y0))      // Access y0 directly from the stacked data point
    .y1(d => y(d.y1))      // Access y1 directly from the stacked data point
    .curve(d3.curveBasis);

  // Map the stacked data to layers
    const layers = stackedSeries.map((series, i) => ({
        key: topKeywords[i],
        color: color(topKeywords[i]),
        values: series.map(d => ({
          data: d.data, // Keep the original data for 'year' access
          y0: d[0],
          y1: d[1]
        }))
      }));

  console.log("Layers:", layers);
  // Draw the layers as areas
  g.selectAll(".layer")
      .data(layers)
      .enter().append("path")
      .attr("class", "layer")
      .attr("d", d => area(d.values))
      .attr("fill", d => d.color);

  // Add the x-axis
  g.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d"))); // Format years as integers

  // Add the y-axis
  g.append("g")
      .call(d3.axisLeft(y));

    // Create legend
      const legendScaleFactor = 0.6; // Adjust this value to control the scaling (e.g., 0.8 for 80%, 0.6 for 60%)
      const originalRectSize = 12; // Keep the original size for calculations
      const originalSpacing = 6;
      const originalVerticalSpacing = 10;

      const legend = g.append("g")
        .attr("transform", `translate(${width + 20}, -20) scale(${legendScaleFactor})`) // Apply the scale transform
        .selectAll(".legend")
        .data(layers)
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(0, ${i * (originalRectSize + originalVerticalSpacing)})`); // Use original spacing for positioning

      legend.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", originalRectSize)
        .attr("height", originalRectSize)
        .attr("fill", d => d.color);

      legend.append("text")
        .attr("x", originalRectSize + originalSpacing)
        .attr("y", originalRectSize / 2)
        .attr("dy", "0.35em")
        .style("font-size", "1em") // Keep font size at 1em and let the scale handle it
        .text(d => d.key);

      return g;
}

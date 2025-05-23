export function createStream(svg, data, options) {
  // Destructure new options: selectedKeyword and onStreamClick
  const { margin, width, height, xPosition, yPosition, topKeywords, selectedKeyword, onStreamClick } = options;

  // Add a class for easy removal by main.js
  const g = svg.append("g")
      .attr("class", "stream-group") // <--- ADDED CLASS
      .attr("transform", `translate(${xPosition + margin.left}, ${yPosition + margin.top})`);

  const years = Array.from(new Set(data.flatMap(d => d.years.map(y => y.year))));
  years.sort(d3.ascending);

  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  const stackedDataInput = years.map(year => {
    const yearData = { year: year };
    // Use the `topKeywords` passed in options, which is potentially adjusted by main.js
    topKeywords.forEach(keyword => { // <--- USE topKeywords FROM OPTIONS
      const keywordEntry = data.find(item => item.keyword === keyword);
      yearData[keyword] = keywordEntry?.years.find(y => y.year === year)?.count || 0;
    });
    return yearData;
  });

  const stack = d3.stack()
    .keys(topKeywords) // <--- USE topKeywords FROM OPTIONS
    .value((d, key) => d[key] || 0);

  const stackedSeries = stack(stackedDataInput);

  y.domain([0, d3.max(stackedSeries.flatMap(layer => layer.map(d => d[1])))]);

  const area = d3.area()
    .x(d => {
      if (d.data) {
        return x(d.data.year);
      } else {
        console.error("d.data is undefined for:", d);
        return 0;
      }
    })
    .y0(d => y(d.y0))
    .y1(d => y(d.y1))
    .curve(d3.curveBasis);

  const layers = stackedSeries.map((series, i) => ({
      key: topKeywords[i],
      color: color(topKeywords[i]),
      values: series.map(d => ({
        data: d.data,
        y0: d[0],
        y1: d[1]
      }))
    }));

  // Create a tooltip div (select existing or create if not present)
  const tooltip = d3.select("body").select(".stream-tooltip");
  if (tooltip.empty()) {
      d3.select("body").append("div")
          .attr("class", "stream-tooltip tooltip")
          .style("opacity", 0)
          .style("position", "absolute")
          .style("background-color", "white")
          .style("border", "solid")
          .style("border-width", "1px")
          .style("border-radius", "5px")
          .style("padding", "8px")
          .style("pointer-events", "none");
  }


  const bisectYear = d3.bisector(d => d.data.year).left;

  g.selectAll(".layer")
      .data(layers)
      .enter().append("path")
      .attr("class", "layer")
      .attr("d", d => area(d.values))
      .attr("fill", d => d.color)
      .attr("stroke", "black")
      .attr("stroke-width", 0.1)
      // --- ADD HIGHLIGHTING BASED ON selectedKeyword ---
      // If a keyword is selected, only highlight that one, others will be dimmed
      .style("opacity", d => (selectedKeyword && d.key !== selectedKeyword) ? 0.3 : 1.0) // Dim unselected
      .classed("selected-stream", d => d.key === selectedKeyword) // <--- ADDED HIGHLIGHT CLASS
      // --- ADD CLICK HANDLER FOR RESET ---
      .on("click", function(event, d) {
          if (onStreamClick) {
              onStreamClick(); // Notify main.js to reset
          }
      })
      .on("mouseover", function(event, d) {
          d3.select(this).raise();
          d3.select(this).style("cursor", "pointer"); // Add pointer cursor
          // Only change opacity for current hover if no specific keyword is selected
          if (!selectedKeyword) {
            d3.select(this).style("fill-opacity", 0.7); // Light highlight
          } else if (d.key === selectedKeyword) {
            // Keep selected item highlighted on hover
            d3.select(this).style("fill-opacity", 0.7);
          } else {
            // Do not change opacity for other streams if a keyword is selected
          }
          tooltip.transition()
              .duration(200)
              .style("opacity", .9);
      })
      .on("mousemove", function(event, d) {
          const [gx, gy] = d3.pointer(event, g.node());
          const invertedX = x.invert(gx);

          const i = bisectYear(d.values, invertedX, 1);
          const d0 = d.values[i - 1];
          const d1 = d.values[i];
          const dataPoint = (d1 && (invertedX - d0.data.year > d1.data.year - invertedX)) ? d1 : d0;

          if (dataPoint) {
              const currentYear = dataPoint.data.year;
              const currentValue = Math.round(dataPoint.y1 - dataPoint.y0);

              tooltip.html(`Keyword: <strong>${d.key}</strong><br/>
                            Year: <strong>${currentYear}</strong><br/>
                            Count: <strong>${currentValue}</strong>`)
                  .style("left", (event.pageX + 15) + "px")
                  .style("top", (event.pageY - 28) + "px");
          }
      })
      .on("mouseout", function(event, d) {
          d3.select(this).style("cursor", "default"); // Reset cursor
          // Only reset opacity if no specific keyword is selected
          if (!selectedKeyword) {
            d3.select(this).style("fill-opacity", 1.0); // Remove highlight
          } else if (d.key === selectedKeyword) {
            d3.select(this).style("fill-opacity", 1.0); // Keep selected item at full opacity
          } else {
            d3.select(this).style("fill-opacity", 0.3); // Keep unselected items dimmed
          }
          tooltip.transition()
              .duration(500)
              .style("opacity", 0);
      });

  g.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  g.append("g")
      .call(d3.axisLeft(y));

  // --- Stream Graph Legend ---
  // Ensure the legend element can be removed by main.js if needed or updated
  const legendGroup = svg.select(".stream-legend");
  if (legendGroup.empty()) {
      svg.append("g")
        .attr("class", "stream-legend") // <--- ADDED CLASS for stream legend
  }

  // This transform now correctly uses `xPosition` and `yPosition` from options
  // and `width` (which is streamWidth) to position relative to the stream graph.
  legendGroup.attr("transform", `translate(${xPosition + width - 1425}, ${yPosition + 15})`);

  const legendScaleFactor = 0.75;
  const originalRectSize = 12;
  const originalSpacing = 6;
  const originalVerticalSpacing = 10;

  const reversedLayers = [...layers].reverse();

  // Update or remove legend items based on selection
  legendGroup.selectAll(".legend-item")
      .data(reversedLayers)
      .join(
          enter => {
              const item = enter.append("g")
                  .attr("class", "legend-item")
                  .attr("transform", (d, i) => `translate(0, ${i * (originalRectSize + originalVerticalSpacing)}) scale(${legendScaleFactor})`); // Apply scale here

              item.append("rect")
                  .attr("x", 0)
                  .attr("y", 0)
                  .attr("width", originalRectSize)
                  .attr("height", originalRectSize)
                  .attr("fill", d => d.color);

              item.append("text")
                  .attr("x", originalRectSize + originalSpacing)
                  .attr("y", originalRectSize / 2)
                  .attr("dy", "0.35em")
                  .style("font-size", "1em") // Keep font size 1em and let scale handle it
                  .text(d => d.key);
              return item;
          },
          update => update
              .attr("transform", (d, i) => `translate(0, ${i * (originalRectSize + originalVerticalSpacing)}) scale(${legendScaleFactor})`)
              .select("rect").attr("fill", d => d.color),
          exit => exit.remove()
      )
      // Apply opacity to legend items based on selection
      .style("opacity", d => (selectedKeyword && d.key !== selectedKeyword) ? 0.3 : 1.0);


  return g;
}

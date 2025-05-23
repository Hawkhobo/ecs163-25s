export function createStream(svg, data, options) {
  const { margin, width, height, xPosition, yPosition, topKeywords, selectedKeyword, onStreamClick } = options;

  const g = svg.append("g")
      .attr("class", "stream-group")
      .attr("transform", `translate(${xPosition + margin.left}, ${yPosition + margin.top})`);

  const years = Array.from(new Set(data.flatMap(d => d.years.map(y => y.year))));
  years.sort(d3.ascending);

  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  const stackedDataInput = years.map(year => {
    const yearData = { year: year };
    topKeywords.forEach(keyword => {
      const keywordEntry = data.find(item => item.keyword === keyword);
      yearData[keyword] = keywordEntry?.years.find(y => y.year === year)?.count || 0;
    });
    return yearData;
  });

  const stack = d3.stack()
    .keys(topKeywords)
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
      .style("opacity", d => (selectedKeyword && d.key !== selectedKeyword) ? 0.3 : 1.0)
      .classed("selected-stream", d => d.key === selectedKeyword)
      .on("click", function(event, d) {
          if (onStreamClick) {
              onStreamClick();
          }
      })
      .on("mouseover", function(event, d) {
          d3.select(this).raise();
          d3.select(this).style("cursor", "pointer");
          if (!selectedKeyword) {
            d3.select(this).style("fill-opacity", 0.7);
          } else if (d.key === selectedKeyword) {
            d3.select(this).style("fill-opacity", 0.7);
          } else {
            // No change for others
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
          d3.select(this).style("cursor", "default");
          if (!selectedKeyword) {
            d3.select(this).style("fill-opacity", 1.0);
          } else if (d.key === selectedKeyword) {
            d3.select(this).style("fill-opacity", 1.0);
          } else {
            d3.select(this).style("fill-opacity", 0.3);
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

  // Stream Graph Legend
  const legendGroup = svg.select(".stream-legend");
  const legendG = legendGroup.empty() ? svg.append("g").attr("class", "stream-legend") : legendGroup;
  legendG.attr("transform", `translate(${xPosition + width - 1425}, ${yPosition + 15})`);

  const legendScaleFactor = 0.75;
  const originalRectSize = 12;
  const originalSpacing = 6;
  const originalVerticalSpacing = 10;

  const reversedLayers = [...layers].reverse();

  legendG.selectAll(".legend-item")
      .data(reversedLayers, d => d.key)
      .join(
          enter => {
              const item = enter.append("g")
                  .attr("class", "legend-item")
                  .attr("transform", (d, i) => `translate(0, ${i * (originalRectSize + originalVerticalSpacing)}) scale(${legendScaleFactor})`);

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
                  .style("font-size", "1em")
                  .text(d => d.key);

              return item;
          },
          update => {
              update.attr("transform", (d, i) => `translate(0, ${i * (originalRectSize + originalVerticalSpacing)}) scale(${legendScaleFactor})`);
              update.select("rect").attr("fill", d => d.color);
              update.select("text").text(d => d.key);

              return update;
          },
          exit => exit.remove()
      )
      .style("opacity", d => (selectedKeyword && d.key !== selectedKeyword) ? 0.3 : 1.0)
      .classed("selected-legend-item", d => d.key === selectedKeyword);


  // --- Zoomed Overlay for Selected Stream ---
  const zoomScale = 2.0; // How much to zoom in
  const zoomOffset = { x: 2, y: -height / 2 }; // Offset for the overlay (adjust as needed)

  // Create or select the overlay group
  let overlayGroup = svg.select(".stream-overlay-group");
  if (overlayGroup.empty()) {
      overlayGroup = svg.append("g")
          .attr("class", "stream-overlay-group")
          .attr("pointer-events", "none"); // Prevent interactions with the overlay
  }

  if (selectedKeyword) {
      // Find the data for the selected keyword
      const selectedLayerData = layers.find(d => d.key === selectedKeyword);

      if (selectedLayerData) {
          // Define zoomed scales
          const zoomX = d3.scaleLinear()
              .domain(d3.extent(years))
              .range([0, width * zoomScale]); // Scale width

          // Get the actual min/max values for the selected layer to zoom accurately
          const selectedLayerValues = selectedLayerData.values.map(d => d.y1 - d.y0);
          const zoomYMin = d3.min(selectedLayerValues);
          const zoomYMax = d3.max(selectedLayerValues);

          // We need a specific Y scale for the zoomed individual layer
          // Let's make it zoom on the *absolute* values of that layer, not the stacked values.
          const zoomY = d3.scaleLinear()
              .domain([0, zoomYMax || 1]) // Domain from 0 to max count of this specific layer
              .range([height * zoomScale / 2, 0]); // Adjust range for visibility

          // Redefine the area generator for the zoomed path, using *only* the current layer's count
          const zoomedArea = d3.area()
              .x(d => zoomX(d.data.year))
              .y0(zoomY(0)) // Base of the stream should be 0 on the zoomed scale
              .y1(d => zoomY(d.y1 - d.y0)) // Use the actual count of the layer
              .curve(d3.curveBasis);

          overlayGroup
              .attr("transform", `translate(${xPosition + margin.left + zoomOffset.x}, ${yPosition + margin.top + zoomOffset.y})`);

          overlayGroup.selectAll(".zoomed-stream")
              .data([selectedLayerData]) // Bind only the selected layer data
              .join(
                  enter => enter.append("path")
                      .attr("class", "zoomed-stream")
                      .attr("d", zoomedArea)
                      .attr("fill", selectedLayerData.color)
                      .attr("stroke", "white")
                      .attr("stroke-width", 2)
                      .style("filter", "drop-shadow(3px 3px 2px rgba(0,0,0,0.4))"), // Add a drop shadow for visibility
                  update => update
                      .attr("d", zoomedArea)
                      .attr("fill", selectedLayerData.color),
                  exit => exit.remove()
              );

          // Optional: Add X and Y axes for the zoomed overlay if desired
          // Adjust position of zoomed axes as needed
         // overlayGroup.select(".zoom-x-axis").remove();
          // overlayGroup.select(".zoom-y-axis").remove();
          // overlayGroup.append("g")
          //     .attr("class", "zoom-x-axis")
          //     .attr("transform", `translate(0, ${height * zoomScale / 2})`) // Position at bottom of zoomed area
          //     .call(d3.axisBottom(zoomX).tickFormat(d3.format("d")));

          // overlayGroup.append("g")
          //     .attr("class", "zoom-y-axis")
          //     .call(d3.axisLeft(zoomY));

      } else {
          // If selectedLayerData is not found (shouldn't happen if selectedKeyword is active), remove overlay
          overlayGroup.selectAll(".zoomed-stream").remove();
      }
  } else {
      // If no keyword is selected, remove the overlay
      overlayGroup.selectAll(".zoomed-stream").remove();
  }

  return g;
}

import { streamLegendXOffset, streamLegendYOffset, legendScaleFactor, streamRectSize } from './dimensions.js'; // Add these imports

export function createStream(svg, data, options) {
  const { margin, width, height, xPosition, yPosition, topKeywords, selectedKeyword, onStreamClick } = options;

  // Clear existing stream group to prevent duplicates on re-render
  svg.selectAll(".stream-group").remove();

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
      .attr("stroke", d => (selectedKeyword && d.key === selectedKeyword) ? "white" : "black")
      .attr("stroke-width", d => (selectedKeyword && d.key === selectedKeyword) ? 2 : 0.1)
      .style("filter", d => (selectedKeyword && d.key === selectedKeyword) ? "drop-shadow(3px 3px 2px rgba(0,0,0,0.4))" : null)
      .style("opacity", d => (selectedKeyword && d.key !== selectedKeyword) ? 0.15 : 1.0)
      .classed("selected-stream", d => d.key === selectedKeyword)
      .on("click", function(event, d) {
          if (onStreamClick) {
              onStreamClick();
          }
      })
      .on("mouseover", function(event, d) {
          d3.select(this).raise();
          d3.select(this).style("cursor", "pointer");

          // Apply temporary opacity change for hover effect
          if (!selectedKeyword) { // If no stream selected, highlight hovered stream
            d3.select(this).style("opacity", 0.7);
          } else if (d.key === selectedKeyword) { // If selected stream is hovered, keep it opaque
            d3.select(this).style("opacity", 1.0);
          } else { // If non-selected stream is hovered (while a stream IS selected), make it slightly more opaque
            d3.select(this).style("opacity", 0.7);
          }

          // --- TOOLTIP LOGIC: Only show tooltip if no keyword is selected, OR if the hovered stream IS the selected keyword ---
          // This ensures individual stream tooltips only activate when no selection or on the selected stream.
          if (!selectedKeyword || d.key === selectedKeyword) {
              tooltip.transition()
                  .duration(200)
                  .style("opacity", .9);
          } else {
              // If a stream IS selected, but this hovered stream is NOT the selected one, suppress tooltip immediately
              tooltip.transition()
                  .duration(0)
                  .style("opacity", 0);
          }
      })
      .on("mousemove", function(event, d) {
          // --- MODIFIED: This mousemove only runs if NO keyword is selected. ---
          // If a keyword IS selected, the 'hover-overlay' will handle the tooltip logic.
          if (!selectedKeyword) {
              const [gx, gy] = d3.pointer(event, g.node());
              const invertedX = x.invert(gx);

              const i = bisectYear(d.values, invertedX, 1);
              const d0 = d.values[i - 1];
              const d1 = d.values[i];
              const dataPoint = (d1 && (invertedX - d0.data.year > d1.data.year - invertedX)) ? d1 : d0;

              tooltip.transition().duration(50).style("opacity", .9); // Ensure visibility

              if (dataPoint) {
                  const currentYear = dataPoint.data.year;
                  const currentValue = Math.round(dataPoint.y1 - dataPoint.y0);

                  tooltip.html(`Keyword: <strong>${d.key}</strong><br/>
                                Year: <strong>${Math.round(currentYear)}</strong><br/>
                                Count: <strong>${currentValue}</strong>`)
                      .style("left", (event.pageX + 15) + "px")
                      .style("top", (event.pageY - 28) + "px");
              } else {
                  tooltip.html(`Keyword: <strong>${d.key}</strong><br/>No data for this year.`);
              }
          }
      })
      .on("mouseout", function(event, d) {
          d3.select(this).style("cursor", "default");

          // Revert opacity based on selection state
          if (!selectedKeyword) {
            d3.select(this).style("opacity", 1.0);
            // --- MODIFIED: Only hide tooltip if no keyword is selected (overlay handles it otherwise) ---
            tooltip.transition().duration(500).style("opacity", 0);
          } else if (d.key === selectedKeyword) {
            d3.select(this).style("opacity", 1.0); // Stay opaque
            // Do NOT hide tooltip, the overlay's mouseout will handle it when leaving the whole area
          } else {
            d3.select(this).style("opacity", 0.15); // Revert to very transparent
            // Do NOT hide tooltip, the overlay's mouseout will handle it when leaving the whole area
          }
      });

  // --- NEW: Transparent Overlay to capture mouse events across the entire graph ---
  g.append("rect")
      .attr("class", "hover-overlay")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none") // Make it invisible
      .attr("pointer-events", "all") // Ensure it captures all mouse events
      .on("mousemove", function(event) {
          // --- This logic ONLY applies when a keyword IS selected ---
          if (selectedKeyword) {
              const [gx, gy] = d3.pointer(event, this); // Get coordinates relative to the overlay rect
              const invertedX = x.invert(gx); // Invert x-coordinate to get the year

              const selectedLayerData = layers.find(l => l.key === selectedKeyword);

              if (selectedLayerData) {
                  // Find the data point for the selected keyword at the current year
                  const i = bisectYear(selectedLayerData.values, invertedX, 1);
                  const d0 = selectedLayerData.values[i - 1];
                  const d1 = selectedLayerData.values[i];
                  const dataPoint = (d1 && (invertedX - d0.data.year > d1.data.year - invertedX)) ? d1 : d0;

                  tooltip.transition()
                      .duration(50) // Quick transition to show
                      .style("opacity", .9);

                  if (dataPoint) {
                      const currentYear = dataPoint.data.year;
                      const currentValue = Math.round(dataPoint.y1 - dataPoint.y0); // Count for the selected stream

                      tooltip.html(`Keyword: <strong>${selectedKeyword}</strong><br/>
                                    Year: <strong>${Math.round(currentYear)}</strong><br/>
                                    Count: <strong>${currentValue}</strong>`)
                          .style("left", (event.pageX + 15) + "px") // Position relative to mouse
                          .style("top", (event.pageY - 28) + "px");
                  } else {
                      // Handle cases where dataPoint might be null (e.g., mouse outside data range for this year)
                      tooltip.html(`Keyword: <strong>${selectedKeyword}</strong><br/>No data at this point.`);
                  }
              }
          }
      })
      .on("mouseout", function() {
          // --- This logic ONLY applies when a keyword IS selected ---
          // Hide the tooltip when the mouse leaves the entire stream graph area.
          if (selectedKeyword) {
              tooltip.transition()
                  .duration(500)
                  .style("opacity", 0);
          }
      });

  g.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  g.append("g")
      .call(d3.axisLeft(y));

  // Stream Graph Legend
  const legendGroup = svg.select(".stream-legend");
  const legendG = legendGroup.empty() ? svg.append("g").attr("class", "stream-legend") : legendGroup;
  legendG.attr("transform", `translate(${xPosition + width - streamLegendXOffset}, ${yPosition + streamLegendYOffset})`);


  const originalSpacing = 6;
  const originalVerticalSpacing = 10;

  const reversedLayers = [...layers].reverse();

  legendG.selectAll(".legend-item")
      .data(reversedLayers, d => d.key)
      .join(
          enter => {
              const item = enter.append("g")
                  .attr("class", "legend-item")
                  .attr("transform", (d, i) => `translate(0, ${i * (streamRectSize + originalVerticalSpacing)}) scale(${legendScaleFactor})`);

              item.append("rect")
                  .attr("x", 0)
                  .attr("y", 0)
                  .attr("width", streamRectSize)
                  .attr("height", streamRectSize)
                  .attr("fill", d => d.color);

              item.append("text")
                  .attr("x", streamRectSize + originalSpacing)
                  .attr("y", streamRectSize / 2)
                  .attr("dy", "0.35em")
                  .style("font-size", "1em")
                  .text(d => d.key);

              return item;
          },
          update => {
              update.attr("transform", (d, i) => `translate(0, ${i * (streamRectSize + originalVerticalSpacing)}) scale(${legendScaleFactor})`);
              update.select("rect").attr("fill", d => d.color);
              update.select("text").text(d => d.key);

              return update;
          },
          exit => exit.remove()
      )
      .style("opacity", d => (selectedKeyword && d.key !== selectedKeyword) ? 0.3 : 1.0)
      .classed("selected-legend-item", d => d.key === selectedKeyword);


  // --- Zoomed Overlay for Selected Stream (No change here, as it provides extra emphasis) ---
  const zoomScale = 2.0;
  const zoomOffset = { x: 0, y: -height / 2 };

  let overlayGroup = svg.select(".stream-overlay-group");
  if (overlayGroup.empty()) {
      overlayGroup = svg.append("g")
          .attr("class", "stream-overlay-group")
          .attr("pointer-events", "none");
  }

  if (selectedKeyword) {
      const selectedLayerData = layers.find(d => d.key === selectedKeyword);

      if (selectedLayerData) {
          const zoomX = d3.scaleLinear()
              .domain(d3.extent(years))
              .range([0, width * zoomScale]);

          const selectedLayerValues = selectedLayerData.values.map(d => d.y1 - d.y0);
          const zoomYMax = d3.max(selectedLayerValues);

          const zoomY = d3.scaleLinear()
              .domain([0, zoomYMax || 1])
              .range([height * zoomScale / 2, 0]);

          const zoomedArea = d3.area()
              .x(d => zoomX(d.data.year))
              .y0(zoomY(0))
              .y1(d => zoomY(d.y1 - d.y0))
              .curve(d3.curveBasis);

          overlayGroup
              .attr("transform", `translate(${xPosition + margin.left + zoomOffset.x}, ${yPosition + margin.top + zoomOffset.y})`);

          overlayGroup.selectAll(".zoomed-stream")
              .data([selectedLayerData])
              .join(
                  enter => enter.append("path")
                      .attr("class", "zoomed-stream")
                      .attr("d", zoomedArea)
                      .attr("fill", selectedLayerData.color)
                      .attr("stroke", "white")
                      .attr("stroke-width", 2)
                      .style("filter", "drop-shadow(3px 3px 2px rgba(0,0,0,0.4))"),
                  update => update
                      .attr("d", zoomedArea)
                      .attr("fill", selectedLayerData.color),
                  exit => exit.remove()
              );
      } else {
          overlayGroup.selectAll(".zoomed-stream").remove();
      }
  } else {
      overlayGroup.selectAll(".zoomed-stream").remove();
  }

  return { g, color };
}

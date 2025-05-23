import { streamLegendXOffset, streamLegendYOffset, legendScaleFactor, streamRectSize, streamHeaderX, streamHeaderY } from './dimensions.js';

import { updateVizHeader } from './updateVizHeader.js'

export function createStream(svg, data, options) {
  const { margin, width, height, xPosition, yPosition, topKeywords, selectedKeyword, onStreamClick } = options;

  // Get or create the stream group (don't remove on re-render to preserve transitions)
  let g = svg.select(".stream-group");
  if (g.empty()) {
    g = svg.append("g")
        .attr("class", "stream-group")
        .attr("transform", `translate(${xPosition + margin.left}, ${yPosition + margin.top})`);
  }

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

  // Create tooltip if it doesn't exist
  let tooltip = d3.select("body").select(".stream-tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body").append("div")
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

  // Bind data to layers and handle enter/update pattern
  const layerPaths = g.selectAll(".layer")
      .data(layers, d => d.key);

  // Handle entering layers
  const layersEnter = layerPaths.enter()
      .append("path")
      .attr("class", "layer")
      .attr("d", d => area(d.values))
      .attr("fill", d => d.color)
      .style("opacity", 0); // Start invisible

  // Merge enter and update selections
  const layersMerged = layersEnter.merge(layerPaths);

  // Apply smooth transitions to all layers
  layersMerged
    .transition()
    .duration(600)
    .ease(d3.easeQuadOut)
    .attr("d", d => area(d.values))
    .attr("fill", d => d.color)
    .attr("stroke", d => (selectedKeyword && d.key === selectedKeyword) ? "white" : "black")
    .attr("stroke-width", d => (selectedKeyword && d.key === selectedKeyword) ? 2 : 0.1)
    .style("filter", d => (selectedKeyword && d.key === selectedKeyword) ? "drop-shadow(3px 3px 2px rgba(0,0,0,0.4))" : null)
    .style("opacity", d => {
      if (!selectedKeyword) return 1.0;
      return d.key === selectedKeyword ? 1.0 : 0.15;
    });

  // Update classes after transition
  layersMerged
    .classed("selected-stream", d => d.key === selectedKeyword);

  // Handle exiting layers
  layerPaths.exit()
    .transition()
    .duration(400)
    .style("opacity", 0)
    .remove();

  // Add event handlers to merged selection
  layersMerged
    .on("click", function(event, d) {
        if (onStreamClick) {
            onStreamClick();
        }
    })
    .on("mouseover", function(event, d) {
        d3.select(this).raise();
        d3.select(this).style("cursor", "pointer");

        // Gentle hover effect with transition
        if (!selectedKeyword) {
          d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 0.7);
        } else if (d.key === selectedKeyword) {
          d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 1.0);
        } else {
          d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 0.4); // Slightly more visible on hover
        }

        // Tooltip logic
        if (!selectedKeyword || d.key === selectedKeyword) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
        } else {
            tooltip.transition()
                .duration(0)
                .style("opacity", 0);
        }
    })
    .on("mousemove", function(event, d) {
        if (!selectedKeyword) {
            const [gx, gy] = d3.pointer(event, g.node());
            const invertedX = x.invert(gx);

            const i = bisectYear(d.values, invertedX, 1);
            const d0 = d.values[i - 1];
            const d1 = d.values[i];
            const dataPoint = (d1 && (invertedX - d0.data.year > d1.data.year - invertedX)) ? d1 : d0;

            tooltip.transition().duration(50).style("opacity", .9);

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

        // Smooth transition back to normal state
        if (!selectedKeyword) {
          d3.select(this)
            .transition()
            .duration(300)
            .style("opacity", 1.0);
          tooltip.transition().duration(500).style("opacity", 0);
        } else if (d.key === selectedKeyword) {
          d3.select(this)
            .transition()
            .duration(300)
            .style("opacity", 1.0);
        } else {
          d3.select(this)
            .transition()
            .duration(300)
            .style("opacity", 0.15);
        }
    });

  // Create or update hover overlay
  let hoverOverlay = g.select(".hover-overlay");
  if (hoverOverlay.empty()) {
    hoverOverlay = g.append("rect")
        .attr("class", "hover-overlay")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "none")
        .attr("pointer-events", "all");
  }

  hoverOverlay
    .on("mousemove", function(event) {
        if (selectedKeyword) {
            const [gx, gy] = d3.pointer(event, this);
            const invertedX = x.invert(gx);

            const selectedLayerData = layers.find(l => l.key === selectedKeyword);

            if (selectedLayerData) {
                const i = bisectYear(selectedLayerData.values, invertedX, 1);
                const d0 = selectedLayerData.values[i - 1];
                const d1 = selectedLayerData.values[i];
                const dataPoint = (d1 && (invertedX - d0.data.year > d1.data.year - invertedX)) ? d1 : d0;

                tooltip.transition()
                    .duration(50)
                    .style("opacity", .9);

                if (dataPoint) {
                    const currentYear = dataPoint.data.year;
                    const currentValue = Math.round(dataPoint.y1 - dataPoint.y0);

                    tooltip.html(`Keyword: <strong>${selectedKeyword}</strong><br/>
                                  Year: <strong>${Math.round(currentYear)}</strong><br/>
                                  Count: <strong>${currentValue}</strong>`)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 28) + "px");
                } else {
                    tooltip.html(`Keyword: <strong>${selectedKeyword}</strong><br/>No data at this point.`);
                }
            }
        }
    })
    .on("mouseout", function() {
        if (selectedKeyword) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        }
    });

  // Add axes
  g.selectAll(".axis").remove(); // Remove old axes
  
  g.append("g")
      .attr("class", "axis axis-x")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  g.append("g")
      .attr("class", "axis axis-y")
      .call(d3.axisLeft(y));

  // X-axis label
  g.append("text")
      .attr("class", "axis-label x-axis-label")
      .attr("x", width / 2)
      .attr("y", height + 30) 
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Year");

  // Y-axis label
  g.append("text")
      .attr("class", "axis-label y-axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -25) // adjust distance left of y-axis as needed
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Keyword Count");

  // add a header
  updateVizHeader(
    g,
    selectedKeyword ? `${selectedKeyword} Measures Over The Years` : "Top 30 Keyword Trends",
    streamHeaderX,
    streamHeaderY
  );

  // Update legend with transitions
  updateStreamLegendWithTransitions(svg, layers, selectedKeyword, xPosition, yPosition, width);

  // Update zoomed overlay with transitions
  updateZoomedOverlayWithTransitions(svg, selectedKeyword, layers, years, width, height, xPosition, yPosition, margin);

  return { g, color };
}

function updateStreamLegendWithTransitions(svg, layers, selectedKeyword, xPosition, yPosition, width) {
  let legendG = svg.select(".stream-legend");
  if (legendG.empty()) {
    legendG = svg.append("g").attr("class", "stream-legend");
  }
  
  legendG.attr("transform", `translate(${xPosition + width - streamLegendXOffset}, ${yPosition + streamLegendYOffset})`);

  const originalSpacing = 6;
  const originalVerticalSpacing = 10;
  const reversedLayers = [...layers].reverse();

  const legendItems = legendG.selectAll(".legend-item")
      .data(reversedLayers, d => d.key);

  // Enter
  const legendEnter = legendItems.enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * (streamRectSize + originalVerticalSpacing)}) scale(${legendScaleFactor})`)
      .style("opacity", 0);

  legendEnter.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", streamRectSize)
      .attr("height", streamRectSize)
      .attr("fill", d => d.color);

  legendEnter.append("text")
      .attr("x", streamRectSize + originalSpacing)
      .attr("y", streamRectSize / 2)
      .attr("dy", "0.35em")
      .style("font-size", "1em")
      .text(d => d.key);

  // Merge and update
  const legendMerged = legendEnter.merge(legendItems);

  legendMerged
    .transition()
    .duration(500)
    .ease(d3.easeQuadOut)
    .attr("transform", (d, i) => `translate(0, ${i * (streamRectSize + originalVerticalSpacing)}) scale(${legendScaleFactor})`)
    .style("opacity", d => (selectedKeyword && d.key !== selectedKeyword) ? 0.3 : 1.0);

  legendMerged.select("rect")
    .transition()
    .duration(500)
    .attr("fill", d => d.color);

  legendMerged.select("text")
    .transition()
    .duration(500)
    .text(d => d.key);

  legendMerged.classed("selected-legend-item", d => d.key === selectedKeyword);

  // Exit
  legendItems.exit()
    .transition()
    .duration(400)
    .style("opacity", 0)
    .remove();
}

function updateZoomedOverlayWithTransitions(svg, selectedKeyword, layers, years, width, height, xPosition, yPosition, margin) {
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

          // Smooth transition for zoomed overlay
          overlayGroup.selectAll(".zoomed-stream")
              .data([selectedLayerData])
              .join(
                  enter => enter.append("path")
                      .attr("class", "zoomed-stream")
                      .style("opacity", 0)
                      .attr("d", zoomedArea)
                      .attr("fill", selectedLayerData.color)
                      .attr("stroke", "white")
                      .attr("stroke-width", 2)
                      .style("filter", "drop-shadow(3px 3px 2px rgba(0,0,0,0.4))")
                      .call(enter => enter.transition()
                          .duration(800)
                          .ease(d3.easeBackOut.overshoot(0.3))
                          .style("opacity", 1)),
                  update => update
                      .transition()
                      .duration(600)
                      .attr("d", zoomedArea)
                      .attr("fill", selectedLayerData.color),
                  exit => exit.transition()
                      .duration(400)
                      .style("opacity", 0)
                      .remove()
              );
      } else {
          overlayGroup.selectAll(".zoomed-stream")
              .transition()
              .duration(400)
              .style("opacity", 0)
              .remove();
      }
  } else {
      overlayGroup.selectAll(".zoomed-stream")
          .transition()
          .duration(400)
          .style("opacity", 0)
          .remove();
  }
}

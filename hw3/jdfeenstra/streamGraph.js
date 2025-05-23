export function createStream(svg, data, options) {
  const { margin, width, height, xPosition, yPosition, topKeywords, selectedKeyword, onStreamClick } = options;

  // --- ADD SVG FILTER DEFINITION HERE ---
  const defs = svg.select("defs");
  const filter = defs.empty() ? svg.append("defs").append("filter") : defs.select("#glow-filter");

  if (filter.empty() || filter.attr("id") !== "glow-filter") {
      svg.append("defs")
         .append("filter")
         .attr("id", "glow-filter")
         .attr("x", "-50%") // Adjust filter area to cover potential blur
         .attr("y", "-50%")
         .attr("width", "200%")
         .attr("height", "200%")
         .append("feGaussianBlur")
         .attr("stdDeviation", "2") // Adjust blur amount here
         .attr("result", "glow");

      // Optional: add a feMerge to stack the glow with the original text
      svg.select("#glow-filter")
         .append("feMerge")
         .append("feMergeNode")
         .attr("in", "glow");
      svg.select("#glow-filter feMerge")
         .append("feMergeNode")
         .attr("in", "SourceGraphic");
  }

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

  // --- Legend Rendering Logic ---
  // Ensure the legend group is always present and correctly positioned
  const legendGroup = svg.select(".stream-legend");
  const legendG = legendGroup.empty() ? svg.append("g").attr("class", "stream-legend") : legendGroup;
  legendG.attr("transform", `translate(${xPosition + width - 1425}, ${yPosition + 15})`);


  const legendScaleFactor = 0.75;
  const originalRectSize = 12;
  const originalSpacing = 6;
  const originalVerticalSpacing = 10;

  const reversedLayers = [...layers].reverse();

  legendG.selectAll(".legend-item") // Use legendG here
      .data(reversedLayers)
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
          update => update
              .attr("transform", (d, i) => `translate(0, ${i * (originalRectSize + originalVerticalSpacing)}) scale(${legendScaleFactor})`)
              .select("rect").attr("fill", d => d.color),
          exit => exit.remove()
      )
      .style("opacity", d => (selectedKeyword && d.key !== selectedKeyword) ? 0.3 : 1.0)
      // --- Stream Legend Highlighting ---
      .classed("selected-legend-item", d => d.key === selectedKeyword);
  return g;
}

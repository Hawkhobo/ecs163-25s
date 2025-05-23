export function createStream(svg, data, options) {
  const { margin, width, height, xPosition, yPosition, topKeywords } = options;
  const g = svg.append("g")
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

  const tooltip = d3.select("body").append("div")
    .attr("class", "stream-tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "5px")
    .style("padding", "8px")
    .style("pointer-events", "none");

  const bisectYear = d3.bisector(d => d.data.year).left;

  g.selectAll(".layer")
      .data(layers)
      .enter().append("path")
      .attr("class", "layer")
      .attr("d", d => area(d.values))
      .attr("fill", d => d.color)
      .attr("stroke", "black")
      .attr("stroke-width", 0.1)
      .on("mouseover", function(event, d) {
          d3.select(this).raise();
          d3.select(this).style("fill-opacity", 0.7);
          tooltip.transition()
              .duration(200)
              .style("opacity", .9);
      })
      .on("mousemove", function(event, d) {
          // --- FIX FOR D3v7: Use event.offsetX or event.clientX / .offsetParent.left ---
          // event.offsetX/offsetY gives coordinates relative to the target element (the path itself)
          // event.clientX/clientY give coordinates relative to the viewport.
          // To get coordinates relative to the 'g' group (which is what x.invert expects from a path),
          // using event.offsetX on the path, then adding its x-offset within the g, or
          // using d3.pointer(event, this) or d3.pointer(event, g.node()) is the robust way.
          // Let's use d3.pointer(event, this) which returns [x, y] relative to the element 'this'.

          const [mx, my] = d3.pointer(event, this); // <--- Use d3.pointer for D3v7

          // mx is now the X coordinate relative to the *path itself*.
          // To get the X coordinate relative to the 'g' element's coordinate system (which 'x' scale works with),
          // we need to consider the X offset of the path within the 'g'.
          // However, d3.pointer(event, containerNode) is often better.
          // Let's get coordinates relative to the 'g' element to use with 'x' scale directly.
          const [gx, gy] = d3.pointer(event, g.node()); // <--- Coordinates relative to 'g' element

          const invertedX = x.invert(gx); // Convert pixel X from 'g' back to a year value

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
          d3.select(this).style("fill-opacity", 1.0);
          tooltip.transition()
              .duration(500)
              .style("opacity", 0);
      });

  g.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  g.append("g")
      .call(d3.axisLeft(y));

  const legendScaleFactor = 0.75;
  const originalRectSize = 12;
  const originalSpacing = 6;
  const originalVerticalSpacing = 10;

  const reversedLayers = [...layers].reverse();

  const legend = g.append("g")
      .attr("transform", `translate(${width - 1425}, +15) scale(${legendScaleFactor})`)
      .selectAll(".legend")
      .data(reversedLayers)
      .enter().append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(0, ${i * (originalRectSize + originalVerticalSpacing)})`);

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
      .style("font-size", "1em")
      .text(d => d.key);

  return g;
}

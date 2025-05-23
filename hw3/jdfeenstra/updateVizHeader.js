export function updateVizHeader(g, title, x, y) {
  let headerText = g.select(".viz-header");

  if (headerText.empty()) {
    headerText = g.append("text")
      .attr("class", "viz-header")
      .attr("x", x)
      .attr("y", y)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .style("opacity", 1)
      .text(title);
  } else {
    headerText
      .transition()
      .duration(200)
      .style("opacity", 0)
      .on("end", function() {
        d3.select(this)
          .text(title)
          .transition()
          .duration(300)
          .style("opacity", 1);
      });
  }
}

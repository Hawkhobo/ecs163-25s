export function createPie(svg, subjectVoteData, histData, allKeywordCounts, options) {  
  // Prepare data for Pie Chart
  const subjectVoteArray = Object.entries(subjectVoteData)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 25)
    .map(([subject, data]) => {
      let topKeyword = 'N/A';
      let bestRank = Infinity;
      data.keywords.forEach(keyword => {
            const trimmedKeyword = keyword ? keyword.trim() : null;

            if (trimmedKeyword) {
              const rankInHistogram = histData.findIndex(item => item.keyword === trimmedKeyword);

              // If the keyword is found in the histogram and its rank is better than the current best
              if (rankInHistogram !== -1 && rankInHistogram < bestRank) {
                bestRank = rankInHistogram;
                topKeyword = trimmedKeyword;
              }
            }
     });

      return {
        subject: subject,
        totalVotes: data.total,
        passFail: data.passFail,
        topKeyword: topKeyword
      };
  });

    console.log("Pie Chart:", JSON.stringify(subjectVoteArray, null, 4));

  const { radius, left, top } = options;
  const g = svg.append("g")
      .attr("transform", `translate(${left + radius}, ${top + radius})`);

  const pie = d3.pie()
    .value(d => d.totalVotes);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  const colorScale = d3.scaleOrdinal()
    .domain(subjectVoteArray.map(d => d.topKeyword))
    .range(d3.schemeCategory10);

  const tooltip = d3.select("body").append("div")
    .attr("class", "pie-tooltip") 
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "5px")
    .style("padding", "8px")
    .style("pointer-events", "none"); 

  g.selectAll(".arc")
    .data(pie(subjectVoteArray))
    .enter().append("path")
    .attr("d", arc)
    .attr("fill", d => colorScale(d.data.topKeyword))
    .attr("class", "arc")
    .attr("stroke", "black") 
    .attr("stroke-width", 1) 
    .on("mouseover", function(event, d) {
          // Bring the hovered arc to the front to ensure tooltip is not obscured
          d3.select(this).raise();

          tooltip.transition()
            .duration(200)
            .style("opacity", .9);

          // Construct tooltip content. 'd.data.subject' name of measure,
          // and 'd.data.totalVotes' is the total votes.
          tooltip.html(`<strong>${d.data.subject}</strong><br/>
                        Total Votes: <strong>${d.data.totalVotes}</strong><br/>
                        Status: ${d.data.passFail}<br/>
                        Top Keyword: ${d.data.topKeyword || 'N/A'}`)
            .style("left", (event.pageX + 15) + "px") // Position next to mouse
            .style("top", (event.pageY - 28) + "px");

          // highlight the arc
          d3.select(this)
            .style("stroke-width", 2)
            .style("stroke", "darkblue");
        })
        .on("mouseout", function(event, d) {
          tooltip.transition()
            .duration(500)
            .style("opacity", 0);

          // remove highlight
          d3.select(this)
            .style("stroke-width", 1)
            .style("stroke", "black");
        });

  const legend = g.append("g")
    .attr("transform", `translate(-375, -${radius})`);

  const uniqueKeywords = [...new Set(subjectVoteArray.map(d => d.topKeyword))];
  legend.selectAll(".legend-item")
    .data(uniqueKeywords)
    .enter().append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 20})`);

  legend.selectAll(".legend-item")
    .append("rect")
    .attr("width", 18)
    .attr("height", 18)
    .attr("fill", colorScale);

  legend.selectAll(".legend-item")
    .append("text")
    .attr("x", 24)
    .attr("y", 9)
    .attr("dy", "0.35em")
    .text(d => d);

  return g; 
}

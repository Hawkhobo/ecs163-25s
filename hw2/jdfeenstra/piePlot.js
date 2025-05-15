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

  g.selectAll(".arc")
    .data(pie(subjectVoteArray))
    .enter().append("path")
    .attr("d", arc)
    .attr("fill", d => colorScale(d.data.topKeyword))
    .attr("class", "arc")
    .attr("stroke", "black") 
    .attr("stroke-width", 1); 

  // pie chart labels
  g.selectAll(".pie-label")
    .data(pie(subjectVoteArray))
    .enter().append("text")
    .attr("transform", d => `translate(${arc.centroid(d)})`)
    .attr("dy", "0.35em")
    .style("text-anchor", "middle")
    .text(d => `${d.data.passFail} (${d.data.topKeyword})`);

  const legend = svg.append("g")
    .attr("transform", `translate(${left + radius + 250}, ${top})`);

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

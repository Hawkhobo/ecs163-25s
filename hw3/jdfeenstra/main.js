import { createHist } from './histPlot.js';
import { createPie } from './piePlot.js';
import { createStream } from './streamGraph.js';
import { processData } from './processData.js';
import { width, height, histX, histY, histWidth, histHeight, histMargin, pieRadius, pieLeft, pieTop,streamX, streamY, streamWidth, streamHeight, streamMargin } from './dimensions.js';

const csvFilePath = 'List_of_Historical_Ballot_Measures.csv';

// create svg container
const svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

d3.csv(csvFilePath)
  // keyword values
  .then(data => {
    const { histData, subjectVotes, streamGraphData, keywordCounts, filteredKeywordCounts, topKeywords } = processData(data);

    const headerGroup = svg.append("g")
      .attr("transform", `translate(${width / 2}, 30)`); // Position the header group

    headerGroup.append("text")
      .attr("text-anchor", "middle")
      .style("font-size", "2em")
      .style("font-weight", "bold")
      .text("Bay Area Ballot Measures Dashboard");

    headerGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("y", 30) 
      .style("font-size", "1em")
      .text("A visualization of historical ballot measures and their key topics.");

    // Plot 1: Histogram
    createHist(svg, filteredKeywordCounts, {
      margin: histMargin,
      width: histWidth,
      height: histHeight,
      xPosition: histX,
      yPosition: histY
    });

    // Plot 2: Pie Chart
    createPie(svg, subjectVotes, histData, keywordCounts, {
      radius: pieRadius,
      left: pieLeft,
      top: pieTop
    });

    // Plot 3: Stream Graph
    createStream(svg, streamGraphData, { 
      margin: streamMargin,
      width: streamWidth,
      height: streamHeight,
      xPosition: streamX,
      yPosition: streamY,
      topKeywords: topKeywords
    });
})

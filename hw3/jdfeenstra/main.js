import { createHist } from './histPlot.js';
import { createPie } from './piePlot.js';
import { createStream } from './streamGraph.js';
import { processData } from './processData.js';
import { width, height, histX, histY, histWidth, histHeight, histMargin, pieRadius, pieLeft, pieTop,streamX, streamY, streamWidth, streamHeight, streamMargin } from './dimensions.js';
import {svg, nextButton, updateViz, goToNextViz, setVizGroups, headerGroup} from './updateViz.js';

const csvFilePath = 'List_of_Historical_Ballot_Measures.csv';

d3.csv(csvFilePath)
  // keyword values
  .then(data => {
    const { histData, subjectVotes, streamGraphData, keywordCounts, filteredKeywordCounts, topKeywords } = processData(data);

    // collect viz groups locally
    const localVizGroups = {};

    // Plot 1: Histogram
    localVizGroups.hist = createHist(svg, filteredKeywordCounts, {
      margin: histMargin,
      width: histWidth,
      height: histHeight,
      xPosition: histX,
      yPosition: histY
    });

    // Plot 2: Pie Chart
    localVizGroups.pie = createPie(svg, subjectVotes, histData, keywordCounts, {
      radius: pieRadius,
      left: pieLeft,
      top: pieTop
    });

    // Plot 3: Stream Graph
    localVizGroups.stream = createStream(svg, streamGraphData, { 
      margin: streamMargin,
      width: streamWidth,
      height: streamHeight,
      xPosition: streamX,
      yPosition: streamY,
      topKeywords: topKeywords
    });

  setVizGroups(localVizGroups);
  // initial display
  updateViz();
  // event listener for button
  nextButton.on("click", () => {
      goToNextViz();
  });

});

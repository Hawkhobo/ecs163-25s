import { createHist } from './histPlot.js';
import { createPie } from './piePlot.js';
import { createStream } from './streamGraph.js';
import { processData } from './processData.js';
import { width, height, histX, histY, histWidth, histHeight, histMargin, pieRadius, pieLeft, pieTop, streamX, streamY, streamWidth, streamHeight, streamMargin, footnoteX, footnoteY, footnoteWidth, footnoteHeight, footnotePadding} from './dimensions.js';

const csvFilePath = 'List_of_Historical_Ballot_Measures.csv'; 

// Create SVG container (ensure it's only created once)
const svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

// Add a group for the header
const headerGroup = svg.append("g")
    .attr("transform", `translate(${width / 2}, 30)`);

headerGroup.append("text")
    .attr("text-anchor", "middle")
    .style("font-size", "2em")
    .style("font-weight", "bold")
    .text("Bay Area Ballot Measures Dashboard");

headerGroup.append("text")
    .attr("text-anchor", "middle")
    .attr("y", 30)
    .style("font-size", "1em")
    .text("A visualization of historical ballot measures and their key topics (keywords). Mouse-over or click on histogram bins to get started!");

// Add a footnote with background box in the bottom-right corner
const footnoteText = `Bay Area Ballot Measures 1961-2010
Dashboard by Jacob Feenstra

1) For the pie chart tooltip, Top Keywords is the most prominent keyword (by number of measures) for a given measure. So if Retirement is one of the 5 keywords for a measure, it is the default Top Keyword (since it is the most popular). Keywords don't exist for all measures; these are marked N/A.

2) Since the original dataset is so huge, this granularity measures keywords with at least 4 occurrences (see histogram).`;

// Append foreignObject for footnote
const footnoteGroup = svg.append("foreignObject")
  .attr("x", footnoteX)
  .attr("y", footnoteY)
  .attr("width", footnoteWidth)
  .attr("height", footnoteHeight)
  .style("overflow", "visible");

// Append HTML content inside the foreignObject
footnoteGroup.append("xhtml:div")
  .style("background", "white")
  .style("border", "1px solid #ccc")
  .style("border-radius", "6px")
  .style("padding", `${footnotePadding}px`)
  .style("font-size", "0.65em")
  .style("font-family", "sans-serif")
  .style("color", "#333")
  .style("opacity", 0.95)
  .style("width", `${footnoteWidth - 2 * footnotePadding}px`)
  .html(footnoteText.replace(/\n/g, "<br>"));

let originalData = null; // Store the raw CSV data once loaded
let currentSelectedKeyword = null; // State variable for the clicked keyword
let streamGraphColorScale = null; // Variable to store the color scale from streamGraph

// Load data and initial render
d3.csv(csvFilePath)
    .then(data => {
        originalData = data; // Store raw data
        renderVisualizations(originalData); // Initial render without selection
    })
    .catch(error => {
        console.error("Error loading or processing data:", error);
    });

// Function to render all visualizations
function renderVisualizations(data, selectedKeyword = null) {
    // Clear existing visualizations before re-rendering
    // This is crucial to avoid drawing multiple charts on top of each other
    svg.selectAll(".hist-group, .pie-group, .pie-legend, .stream-group, .stream-overlay-group, .stream-legend").remove(); 

    // Process data based on the selected keyword
    const processed = processData(data, selectedKeyword);
    const {
        histData,
        subjectVotes,
        streamGraphData,
        keywordCounts,
        filteredKeywordCounts,
        topKeywords, 
    } = processed;

    // Plot 1: Histogram
    // Pass the selectedKeyword for highlighting
    createHist(svg, filteredKeywordCounts, {
        margin: histMargin,
        width: histWidth,
        height: histHeight,
        xPosition: histX,
        yPosition: histY,
        onBarClick: handleHistogramClick, 
        selectedKeyword: selectedKeyword 
    });

    // Plot 3: Stream Graph (Rendered before Pie to get its color scale)
    // Capture the result which now contains the 'g' group AND the 'color' scale
    const streamGraphResult = createStream(svg, streamGraphData, { // **MODIFIED:** Capture result
        margin: streamMargin,
        width: streamWidth,
        height: streamHeight,
        xPosition: streamX,
        yPosition: streamY,
        topKeywords: topKeywords, 
        selectedKeyword: selectedKeyword, 
        onStreamClick: handleStreamClick 
    });
    streamGraphColorScale = streamGraphResult.color; 

    // Plot 2: Pie Chart
    // Pass the dynamically filtered data and the selectedKeyword for highlighting
    createPie(svg, subjectVotes, histData, keywordCounts, {
        radius: pieRadius,
        left: pieLeft,
        top: pieTop,
        selectedKeyword: selectedKeyword, 
        selectedKeywordColor: selectedKeyword ? streamGraphColorScale(selectedKeyword) : null 
    });
}

// Callback function for histogram bar clicks
function handleHistogramClick(clickedKeyword) {
    if (currentSelectedKeyword === clickedKeyword) {
        // If the same keyword is clicked again, deselect it (reset)
        currentSelectedKeyword = null;
    } else {
        // Otherwise, set the new selected keyword
        currentSelectedKeyword = clickedKeyword;
    }
    // Re-render all visualizations with the new selection state
    renderVisualizations(originalData, currentSelectedKeyword);
}

// Callback function for pie chart clicks (for reset)
function handlePieClick() {
    if (currentSelectedKeyword !== null) {
        currentSelectedKeyword = null; // Deselect
        renderVisualizations(originalData, currentSelectedKeyword);
    }
}

// Callback function for stream graph clicks (for reset)
function handleStreamClick() {
    if (currentSelectedKeyword !== null) {
        currentSelectedKeyword = null; // Deselect
        renderVisualizations(originalData, currentSelectedKeyword);
    }
}

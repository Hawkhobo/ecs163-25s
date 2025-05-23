import { createHist } from './histPlot.js';
import { createPie } from './piePlot.js';
import { createStream } from './streamGraph.js';
import { processData } from './processData.js';
import { width, height, histX, histY, histWidth, histHeight, histMargin, pieRadius, pieLeft, pieTop, streamX, streamY, streamWidth, streamHeight, streamMargin } from './dimensions.js';

const csvFilePath = 'List_of_Historical_Ballot_Measures.csv'; // Keeping your exact CSV path

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
    .text("A visualization of historical ballot measures and their key topics.");


let originalData = null; // Store the raw CSV data once loaded
let currentSelectedKeyword = null; // State variable for the clicked keyword
let streamGraphColorScale = null; // **NEW:** Variable to store the color scale from streamGraph


// Function to render all visualizations
function renderVisualizations(data, selectedKeyword = null) {
    // Clear existing visualizations before re-rendering
    // This is crucial to avoid drawing multiple charts on top of each other
    svg.selectAll(".hist-group, .pie-group, .pie-legend, .stream-group, .stream-overlay-group, .stream-legend").remove(); // **MODIFIED:** Added .pie-legend, .stream-overlay-group, .stream-legend for complete clearing

    // Process data based on the selected keyword
    const processed = processData(data, selectedKeyword);
    const {
        histData,
        subjectVotes,
        streamGraphData,
        keywordCounts,
        filteredKeywordCounts,
        topKeywords, // This will be the potentially adjusted topKeywords for stream
    } = processed;

    // Plot 1: Histogram
    // Pass the selectedKeyword for highlighting
    createHist(svg, filteredKeywordCounts, {
        margin: histMargin,
        width: histWidth,
        height: histHeight,
        xPosition: histX,
        yPosition: histY,
        onBarClick: handleHistogramClick, // Pass the callback
        selectedKeyword: selectedKeyword // Pass the current selection for highlighting
    });

    // Plot 3: Stream Graph (Rendered before Pie to get its color scale)
    // Capture the result which now contains the 'g' group AND the 'color' scale
    const streamGraphResult = createStream(svg, streamGraphData, { // **MODIFIED:** Capture result
        margin: streamMargin,
        width: streamWidth,
        height: streamHeight,
        xPosition: streamX,
        yPosition: streamY,
        topKeywords: topKeywords, // Use the potentially adjusted topKeywords
        selectedKeyword: selectedKeyword, // Pass the current selection for highlighting
        onStreamClick: handleStreamClick // Pass the callback for reset
    });
    streamGraphColorScale = streamGraphResult.color; // **NEW:** Store the color scale for pie chart use

    // Plot 2: Pie Chart
    // Pass the dynamically filtered data and the selectedKeyword for highlighting
    createPie(svg, subjectVotes, histData, keywordCounts, {
        radius: pieRadius,
        left: pieLeft,
        top: pieTop,
        selectedKeyword: selectedKeyword, // Pass the current selection for highlighting
        onPieClick: handlePieClick, // Pass the callback for reset
        selectedKeywordColor: selectedKeyword ? streamGraphColorScale(selectedKeyword) : null // **NEW:** Pass the specific color
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


// Load data and initial render
d3.csv(csvFilePath)
    .then(data => {
        originalData = data; // Store raw data
        renderVisualizations(originalData); // Initial render without selection
    })
    .catch(error => {
        console.error("Error loading or processing data:", error);
    });

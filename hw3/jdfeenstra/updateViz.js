import {width, height} from './dimensions.js';
// create svg container
export const svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

// button div
const buttonContainer = d3.select("body").append("div")
  .style("text-align", "center") .style("margin-top", "20px"); // "next" button for each visualization

export const nextButton = buttonContainer.append("button") .text("Next Visualization")
  .style("padding", "10px 20px")
  .style("font-size", "16px")
  .style("cursor", "pointer")

let currentVizIndex = 0; // 0 for hist, 1 for pie, 2 for stream
const vizOrder = ['hist', 'pie', 'stream'];
let vizGroups = {}; // refs to the D3 groups for each visualization

export const headerGroup = svg.append("g")
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

// when called, updates the displayed visualization
export function updateViz() {
    // Hide all visualizations
    Object.values(vizGroups).forEach(group => group.style("display", "none"));

    // Show the current visualization
    const currentVizName = vizOrder[currentVizIndex];
    if (vizGroups[currentVizName]) {
        vizGroups[currentVizName].style("display", "block");
    }

    // Disable the button if it's the last visualization
    if (currentVizIndex === vizOrder.length - 1) {
        nextButton.attr("disabled", true);
    } else {
        nextButton.attr("disabled", null); // Enable the button
    }
}

// increment visualizaion index
export function goToNextViz() {
  if (currentVizIndex < vizOrder.length - 1) {
    currentVizIndex++;
    updateViz();
  }
}

// set visGroups
export function setVizGroups(groups) {
  vizGroups = groups;
}

// get current viz index if needed
export function getCurrVizIndex() {
  return currentVizIndex();
}

// get vizOrder
export function getVizOrder() {
    return vizOrder;
}

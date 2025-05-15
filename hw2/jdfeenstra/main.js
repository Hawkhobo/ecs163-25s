import { createHist } from './histPlot.js';
import { createPie } from './piePlot.js';
import { createStream } from './streamGraph.js';

const width = window.innerWidth;
const height = window.innerHeight;

let histX = 30;
let histY = 10;
let histWidth = 600;
let histHeight = 850;
let histMargin = {top: 10, right: 30, bottom: 30, left: 60};

let pieRadius = Math.min(600, 600) / 2 - 50;
let pieLeft = 700, pieTop = 400;

let streamX = 700;
let streamY = 10;
let streamWidth = 800;
let streamHeight = 300;
let streamMargin = { top: 20, right: 30, bottom: 30, left: 50 };

const csvFilePath = 'List_of_Historical_Ballot_Measures.csv';

// create svg container
const svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

d3.csv(csvFilePath)
  // keyword values
  .then(data => {
    const keywordColumns = ['Keyword1', 'Keyword2', 'Keyword3', 'Keyword4', 'Keyword5'];
    const keywordCounts = {};
    const filteredKeywordCounts = {};
    const subjectVotes = {};

    data.forEach(row => {
      // generate key-value pair containing all unique Keyword1-5's from csv
      keywordColumns.forEach(column => {
        const keyword = row[column] ? row[column].trim() : null;
        if (keyword) {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        }
      });

      // determine totalVotes, given a ballot.
      const subject = row.Subject.trim();
      const yesVotes = +row['Yes Votes'];
      const noVotes = +row['No Votes'];
      const totalVotes = yesVotes + noVotes;

      // create subjectVotes key-value pair.
      // Subject => passFail, totalVotes, most popular keyword (Keyword1-5)
      subjectVotes[subject] = (subjectVotes[subject] || { total: 0, keywords: [], passFail: row['Pass or Fail'] });
      subjectVotes[subject].total += totalVotes;
      keywordColumns.forEach(col => {
        const keyword = row[col] ? row[col].trim() : null;
        if (keyword) {
          subjectVotes[subject].keywords.push(keyword);
        }
      });
      subjectVotes[subject].passFail = row['Pass or Fail'];

    }); 

    // filter out keywords with 3 or less occurrences, since the data has an abundance of outliers.
    for (const keyword in keywordCounts) {
      if (keywordCounts.hasOwnProperty(keyword) && keywordCounts[keyword] > 3) {
        filteredKeywordCounts[keyword] = keywordCounts[keyword];
      }
    }

    // prepare histogram data here (also works for pie chart)
    const histData = Object.entries(filteredKeywordCounts).map(([key, value]) => ({
      keyword: key,
      count: value
    }));
    histData.sort((a, b) => b.count - a.count);

   // Prepare data for stream graph
    const topKeywords = Object.entries(keywordCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 30)
        .map(([keyword]) => keyword);

    // prepare data for stream graph
   const streamGraphData = topKeywords.map(keyword => {
          const keywordData = {
              keyword: keyword,
              years: []
          };
          data.forEach(row => {
              const year = +row.Year;
              let keywordCount = 0;
              keywordColumns.forEach(col => {
                  if (row[col]?.trim() === keyword) {
                      keywordCount++;
                  }
              });
              // Check if year already exists.
              const existingYearData = keywordData.years.find(y => y.year === year);
              if (existingYearData) {
                existingYearData.count += keywordCount;
              }
              else {
                keywordData.years.push({ year: year, count: keywordCount });
              }

          });
          return keywordData;
      });

    console.log("Histogram:", JSON.stringify(histData, null, 2));
    console.log("Measure Pops:", JSON.stringify(subjectVotes, null, 2));
    console.log("Stream Graph:", JSON.stringify(streamGraphData, null, 2));
    
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

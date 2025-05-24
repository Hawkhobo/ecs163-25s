export function processData(data, selectedKeyword = null) {
  const keywordColumns = ['Keyword1', 'Keyword2', 'Keyword3', 'Keyword4', 'Keyword5'];
  const keywordCounts = {};
  const allSubjectVotes = {};
  const filteredKeywordCounts = {};

  data.forEach(row => {
    keywordColumns.forEach(column => {
      const keyword = row[column] ? row[column].trim() : null;
      if (keyword) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
    });

    const subject = row.Subject.trim();
    const yesVotes = +row['Yes Votes'];
    const noVotes = +row['No Votes'];
    const totalVotes = yesVotes + noVotes;

    allSubjectVotes[subject] = (allSubjectVotes[subject] || { total: 0, keywords: new Set(), passFail: row['Pass or Fail'] });
    allSubjectVotes[subject].total += totalVotes;
    keywordColumns.forEach(col => {
      const keyword = row[col] ? row[col].trim() : null;
      if (keyword) {
        allSubjectVotes[subject].keywords.add(keyword);
      }
    });
    allSubjectVotes[subject].passFail = row['Pass or Fail'];
  });

  for (const subject in allSubjectVotes) {
    allSubjectVotes[subject].keywords = Array.from(allSubjectVotes[subject].keywords);
  }

  for (const keyword in keywordCounts) {
    if (keywordCounts.hasOwnProperty(keyword) && keywordCounts[keyword] > 3) {
      filteredKeywordCounts[keyword] = keywordCounts[keyword];
    }
  }

  // histogram data processing
  const histData = Object.entries(filteredKeywordCounts).map(([key, value]) => ({
    keyword: key,
    count: value
  }));
  histData.sort((a, b) => b.count - a.count);

  const initialTop30Keywords = Object.entries(keywordCounts)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 30)
    .map(([keyword]) => keyword);

  let adjustedTopKeywords;

  if (selectedKeyword) {
    // A keyword IS selected.
    if (initialTop30Keywords.includes(selectedKeyword)) {
      // Case 1: Selected keyword is already in the top 30.
      // Display the original top 30, and highlight the selected one.
      adjustedTopKeywords = [...initialTop30Keywords];
    } else {
      // Case 2: Selected keyword is NOT in the top 30.
      // Replace the 30th keyword with the selected one.
      adjustedTopKeywords = [...initialTop30Keywords]; // Start with the top 30
      if (adjustedTopKeywords.length === 30) {
        adjustedTopKeywords[29] = selectedKeyword; // Replace the 30th (index 29)
      } else {
        adjustedTopKeywords.push(selectedKeyword); // If less than 30, just add it.
      }
    }
  } else {
    // NO keyword is selected (initial load or deselection).
    // Always revert to the original top 30 keywords.
    adjustedTopKeywords = [...initialTop30Keywords];
  }

  const streamGraphData = adjustedTopKeywords.map(keyword => {
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
      const existingYearData = keywordData.years.find(y => y.year === year);
      if (existingYearData) {
        existingYearData.count += keywordCount;
      } else {
        keywordData.years.push({ year: year, count: keywordCount });
      }
    });
    return keywordData;
  });

  // -- Pie Chart Data Processing --
  let pieDataForPlot;

  if (selectedKeyword) {
    const filteredSubjects = Object.entries(allSubjectVotes).filter(([subject, data]) =>
      data.keywords.includes(selectedKeyword)
    );

    pieDataForPlot = filteredSubjects
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([subject, data]) => {
        let topKeyword = 'N/A';
        let bestRank = Infinity;
        data.keywords.forEach(keyword => {
          const trimmedKeyword = keyword ? keyword.trim() : null;
          if (trimmedKeyword) {
            const rankInHistogram = histData.findIndex(item => item.keyword === trimmedKeyword);
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
  } else {
    pieDataForPlot = Object.entries(allSubjectVotes)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 25)
      .map(([subject, data]) => {
        let topKeyword = 'N/A';
        let bestRank = Infinity;
        data.keywords.forEach(keyword => {
          const trimmedKeyword = keyword ? keyword.trim() : null;
          if (trimmedKeyword) {
            const rankInHistogram = histData.findIndex(item => item.keyword === trimmedKeyword);
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
  }
  // Stream Graph data is not really processed here; it is derived directly from the histogram, with some moderate adjustments in streamGraph.js
  
  return {
    histData,
    subjectVotes: pieDataForPlot,
    streamGraphData,
    keywordCounts,
    filteredKeywordCounts,
    topKeywords: adjustedTopKeywords, 
    pieFilteredByKeyword: pieDataForPlot
  };
}

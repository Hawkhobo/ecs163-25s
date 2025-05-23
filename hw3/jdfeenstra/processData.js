export function processData(data, selectedKeyword = null) {
  const keywordColumns = ['Keyword1', 'Keyword2', 'Keyword3', 'Keyword4', 'Keyword5'];
  const keywordCounts = {};
  const allSubjectVotes = {}; // Rename to avoid confusion with the final 'subjectVotes' returned
  const filteredKeywordCounts = {};

  // First pass: Calculate original keywordCounts and allSubjectVotes
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

    // Store keywords for each subject directly in the allSubjectVotes object
    allSubjectVotes[subject] = (allSubjectVotes[subject] || { total: 0, keywords: new Set(), passFail: row['Pass or Fail'] }); // Use Set to avoid duplicate keywords
    allSubjectVotes[subject].total += totalVotes;
    keywordColumns.forEach(col => {
      const keyword = row[col] ? row[col].trim() : null;
      if (keyword) {
        allSubjectVotes[subject].keywords.add(keyword); // Add to Set
      }
    });
    allSubjectVotes[subject].passFail = row['Pass or Fail'];
  });

  // Convert keywords Sets to Arrays for consistency
  for (const subject in allSubjectVotes) {
    allSubjectVotes[subject].keywords = Array.from(allSubjectVotes[subject].keywords);
  }

  // Filter out keywords with 3 or less occurrences for histogram (unchanged)
  for (const keyword in keywordCounts) {
    if (keywordCounts.hasOwnProperty(keyword) && keywordCounts[keyword] > 3) {
      filteredKeywordCounts[keyword] = keywordCounts[keyword];
    }
  }

  // Prepare histogram data (unchanged)
  const histData = Object.entries(filteredKeywordCounts).map(([key, value]) => ({
    keyword: key,
    count: value
  }));
  histData.sort((a, b) => b.count - a.count);

  // --- Stream Graph Data Adjustment ---
  let adjustedTopKeywords = Object.entries(keywordCounts)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 30)
    .map(([keyword]) => keyword);

  const thirtyThKeywordIndex = 29; // Index of the 30th keyword (0-indexed)
  // Ensure we have at least 30 keywords before trying to replace the 30th
  if (adjustedTopKeywords.length >= 30) {
    // Find the actual 30th keyword to replace, rather than assuming 'Mayor'
    const keywordToReplace = adjustedTopKeywords[thirtyThKeywordIndex];

    if (selectedKeyword && !adjustedTopKeywords.includes(selectedKeyword)) {
        adjustedTopKeywords[thirtyThKeywordIndex] = selectedKeyword;
    }
  } else if (selectedKeyword && !adjustedTopKeywords.includes(selectedKeyword)) {
      // If there are less than 30 keywords and a new one is selected, just add it
      adjustedTopKeywords.push(selectedKeyword);
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

  // --- Pie Chart Data Adjustment ---
  let pieDataForPlot; // This will hold the final array for piePlot

  if (selectedKeyword) {
    // Filter subjectVoteData to only include subjects relevant to the selectedKeyword
    const filteredSubjects = Object.entries(allSubjectVotes).filter(([subject, data]) =>
      data.keywords.includes(selectedKeyword)
    );

    pieDataForPlot = filteredSubjects
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([subject, data]) => {
        // topKeyword for the filtered measures
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
    // When no keyword is selected, revert to top 25 measures by total votes
    pieDataForPlot = Object.entries(allSubjectVotes)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 25) // <--- ADDED SLICE TO GET TOP 25
      .map(([subject, data]) => {
        // This recalculates topKeyword for the top 25 unfiltered measures
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

  return {
    histData,
    subjectVotes: pieDataForPlot, // <--- Now subjectVotes always returns the processed array
    streamGraphData,
    keywordCounts,
    filteredKeywordCounts,
    topKeywords: adjustedTopKeywords,
    pieFilteredByKeyword: pieDataForPlot // Both now point to the same final data for the pie
  };
}

 export function processData(data, selectedKeyword = null) {
  const keywordColumns = ['Keyword1', 'Keyword2', 'Keyword3', 'Keyword4', 'Keyword5'];
  const keywordCounts = {};
  const subjectVotes = {}; // Original subject votes for pie chart
  const filteredKeywordCounts = {}; // For histogram

  // First pass: Calculate original keywordCounts and subjectVotes
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
    .slice(0, 30) // Get original top 30
    .map(([keyword]) => keyword);

  const originalTop30Keyword = 'Mayor'; // Define the 30th keyword to replace (or whatever it is in your data)
                                        // You might want to make this more robust, e.g., by finding the 30th
                                        // keyword from the sorted list if 'Mayor' isn't consistently 30th.
                                        // For now, assuming 'Mayor' is a placeholder for the 30th.

  if (selectedKeyword && !adjustedTopKeywords.includes(selectedKeyword)) {
    // If a keyword is selected and it's NOT in the current top 30,
    // replace the 30th keyword with the selected one.
    const mayorIndex = adjustedTopKeywords.indexOf(originalTop30Keyword);
    if (mayorIndex !== -1) {
        adjustedTopKeywords[mayorIndex] = selectedKeyword;
    } else {
        // Fallback if 'Mayor' isn't exactly the 30th or present, just replace the last one.
        adjustedTopKeywords[adjustedTopKeywords.length - 1] = selectedKeyword;
    }
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
  let pieFilteredByKeyword = null;
  if (selectedKeyword) {
    // Filter subjectVoteData to only include subjects relevant to the selectedKeyword
    const filteredSubjects = Object.entries(subjectVotes).filter(([subject, data]) =>
      data.keywords.includes(selectedKeyword)
    );

    // Now, convert to the array format expected by createPie, but for the filtered set.
    // Also, remove the slice(0, 25) limit here if you want ALL relevant measures.
    // Sorting by total votes is still good.
    pieFilteredByKeyword = filteredSubjects
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([subject, data]) => {
        // Re-calculate topKeyword for consistency, though it might not be used for coloring
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
          topKeyword: topKeyword // This will be the original top keyword for the subject
        };
      });
  }


  console.log("Histogram Data (from processing):", JSON.stringify(histData, null, 2));
  console.log("Subject Vote Data (from processing):", JSON.stringify(subjectVotes, null, 2));
  console.log("Stream Graph Data (from processing):", JSON.stringify(streamGraphData, null, 2));
  if (selectedKeyword) {
      console.log("Pie Chart Data (filtered by keyword):", JSON.stringify(pieFilteredByKeyword, null, 2));
  }

  return {
    histData,
    subjectVotes, // Original for when no keyword is selected
    streamGraphData, // Potentially adjusted based on selectedKeyword
    keywordCounts,
    filteredKeywordCounts,
    topKeywords: adjustedTopKeywords, // Pass the adjusted list of top keywords
    pieFilteredByKeyword // Filtered data for pie when a keyword is selected
  };
}

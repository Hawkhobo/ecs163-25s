 export function processData(data) {
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

  console.log("Histogram Data (from processing):", JSON.stringify(histData, null, 2));
  console.log("Subject Vote Data (from processing):", JSON.stringify(subjectVotes, null, 2));
  console.log("Stream Graph Data (from processing):", JSON.stringify(streamGraphData, null, 2));

  return { histData, subjectVotes, streamGraphData, keywordCounts, filteredKeywordCounts, topKeywords };
 }

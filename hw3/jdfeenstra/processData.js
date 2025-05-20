export function processData(data) {
    const keywordColumns = ['Keyword1', 'Keyword2', 'Keyword3', 'Keyword4', 'Keyword5'];
    const keywordCounts = {};
    const filteredKeywordCounts = {};
    const subjectVotes = {};

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

    for (const keyword in keywordCounts) {
        if (keywordCounts.hasOwnProperty(keyword) && keywordCounts[keyword] > 3) {
            filteredKeywordCounts[keyword] = keywordCounts[keyword];
        }
    }

    const histData = Object.entries(filteredKeywordCounts).map(([key, value]) => ({
        keyword: key,
        count: value
    }));
    histData.sort((a, b) => b.count - a.count);

    const topKeywords = Object.entries(keywordCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 30)
        .map(([keyword]) => keyword);

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
            const existingYearData = keywordData.years.find(y => y.year === year);
            if (existingYearData) {
                existingYearData.count += keywordCount;
            } else {
                keywordData.years.push({ year: year, count: keywordCount });
            }
        });
        return keywordData;
    });

    console.log("Histogram Data:", JSON.stringify(histData, null, 2));
    console.log("Subject Vote Data:", JSON.stringify(subjectVotes, null, 2));
    console.log("Stream Graph Data:", JSON.stringify(streamGraphData, null, 2));

    return {
        histData: histData,
        subjectVotes: subjectVotes,
        streamGraphData: streamGraphData,
        keywordCounts: keywordCounts, 
        topKeywords: topKeywords,    
    };
}

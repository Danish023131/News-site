// fetchNews.js
// Ye script sources.js me di gayi saari RSS feeds se latest articles
// fetch karta hai aur ek JSON file (data/raw-news.json) me save karta hai.
// Isse hum baad me AI se rewrite/expand karenge.

const Parser = require("rss-parser");
const fs = require("fs");
const path = require("path");
const sources = require("./sources");

const parser = new Parser({
  timeout: 10000, // 10 second timeout per feed, taaki ek slow feed pura script na roke
});

const ARTICLES_PER_SOURCE = 5; // har source se kitni latest headlines leni hain

async function fetchAllFeeds() {
  const allArticles = [];

  for (const source of sources) {
    try {
      console.log(`Fetching: ${source.name} (${source.category})...`);
      const feed = await parser.parseURL(source.url);

      const items = feed.items.slice(0, ARTICLES_PER_SOURCE).map((item) => ({
        title: item.title || "",
        link: item.link || "",
        pubDate: item.pubDate || new Date().toISOString(),
        contentSnippet: item.contentSnippet || item.content || "",
        source: source.name,
        category: source.category,
        fetchedAt: new Date().toISOString(),
      }));

      allArticles.push(...items);
      console.log(`  -> ${items.length} articles fetched.`);
    } catch (err) {
      // Agar ek feed fail ho (down ho, ya URL change ho gaya ho), to poora
      // script crash nahi hoga — bas error log hoga aur agli feed try hogi.
      console.error(`  -> FAILED: ${source.name}: ${err.message}`);
    }
  }

  return allArticles;
}

async function main() {
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const articles = await fetchAllFeeds();

  const outputPath = path.join(dataDir, "raw-news.json");
  fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2), "utf-8");

  console.log(`\nTotal articles fetched: ${articles.length}`);
  console.log(`Saved to: ${outputPath}`);
}

main();


// fetchNews.js
const Parser = require("rss-parser");
const fs = require("fs");
const path = require("path");
const sources = require("./sources");

const parser = new Parser({
  timeout: 10000,
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail"],
    ],
  },
});

function extractImageUrl(item) {
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  if (item.mediaContent && item.mediaContent[0] && item.mediaContent[0].$ && item.mediaContent[0].$.url) {
    return item.mediaContent[0].$.url;
  }
  if (item.mediaThumbnail && item.mediaThumbnail.$ && item.mediaThumbnail.$.url) {
    return item.mediaThumbnail.$.url;
  }
  const html = item.content || item["content:encoded"] || "";
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) return match[1];
  return null;
}

const ARTICLES_PER_SOURCE = 5;

const CONFIG_PATH = path.join(__dirname, "config.json");
function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return { articlesPerCategory: 1 };
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

function limitPerCategory(articles, limit) {
  const byCategory = {};
  for (const article of articles) {
    if (!byCategory[article.category]) byCategory[article.category] = [];
    byCategory[article.category].push(article);
  }
  const result = [];
  for (const category of Object.keys(byCategory)) {
    const sorted = byCategory[category].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    result.push(...sorted.slice(0, limit));
  }
  return result;
}

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
        imageUrl: extractImageUrl(item),
        source: source.name,
        category: source.category,
        fetchedAt: new Date().toISOString(),
      }));
      allArticles.push(...items);
      console.log(`  -> ${items.length} articles fetched.`);
    } catch (err) {
      console.error(`  -> FAILED: ${source.name}: ${err.message}`);
    }
  }
  return allArticles;
}

async function main() {
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const allArticles = await fetchAllFeeds();
  const config = loadConfig();
  const articles = limitPerCategory(allArticles, config.articlesPerCategory);

  const outputPath = path.join(dataDir, "raw-news.json");
  fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2), "utf-8");

  console.log(`\nTotal fetched (before limit): ${allArticles.length}`);
  console.log(`Kept after per-category limit (${config.articlesPerCategory}/category): ${articles.length}`);
  console.log(`Saved to: ${outputPath}`);
}

main();

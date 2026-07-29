// rewriteNews.js
// Ye script data/raw-news.json padhta hai, har article ko Gemini API se
// rewrite/expand karata hai (unique content + SEO title + meta description),
// aur result ko data/articles.json me save karta hai.

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  console.error("ERROR: GEMINI_API_KEY .env file me nahi mili. Pehle .env set karo.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// "latest" alias use kar rahe hain taaki Google model version update kare
// to code break na ho. Free tier me available.
const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

const RAW_PATH = path.join(__dirname, "data", "raw-news.json");
const OUTPUT_PATH = path.join(__dirname, "data", "articles.json");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPrompt(article) {
  return `Tum ek professional news editor ho. Neeche diya gaya news headline aur
snippet padho aur ek naya, unique, well-written news article banao.

Rules:
- Original wording copy mat karo, apne shabdo me poora naya likho
- Article 250-400 words ka ho, informative aur neutral tone me
- Ek catchy SEO-friendly title banao (original se alag wording)
- Ek 1-2 line meta description banao (SEO ke liye, 160 characters se kam)
- Sirf valid JSON return karo, koi extra text/markdown nahi

Input:
Title: ${article.title}
Snippet: ${article.contentSnippet}
Category: ${article.category}
Source: ${article.source}

Return EXACTLY this JSON structure, nothing else:
{
  "title": "...",
  "metaDescription": "...",
  "body": "...",
  "category": "${article.category}",
  "sourceLink": "${article.link}",
  "sourceName": "${article.source}"
}`;
}

async function rewriteArticle(article, index, total, retryCount = 0) {
  console.log(`[${index + 1}/${total}] Rewriting: ${article.title.slice(0, 60)}...`);

  try {
    const result = await model.generateContent(buildPrompt(article));
    let text = result.response.text().trim();

    text = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

    const parsed = JSON.parse(text);
    parsed.originalTitle = article.title;
    parsed.pubDate = article.pubDate;
    parsed.generatedAt = new Date().toISOString();

    return parsed;
  } catch (err) {
    const isRateLimit = err.message.includes("429") || err.message.includes("quota");

    if (isRateLimit && retryCount < 3) {
      const match = err.message.match(/retryDelay":"(\d+)s/);
      const waitSeconds = match ? parseInt(match[1], 10) + 2 : 20;
      console.log(`  -> Rate limit hit, ${waitSeconds}s wait karke retry (attempt ${retryCount + 1}/3)...`);
      await sleep(waitSeconds * 1000);
      return rewriteArticle(article, index, total, retryCount + 1);
    }

    console.error(`  -> FAILED: ${err.message.slice(0, 150)}`);
    return null;
  }
}

async function main() {
  if (!fs.existsSync(RAW_PATH)) {
    console.error("ERROR: data/raw-news.json nahi mili. Pehle 'node fetchNews.js' chalao.");
    process.exit(1);
  }

  const rawArticles = JSON.parse(fs.readFileSync(RAW_PATH, "utf-8"));
  const rewritten = [];

  for (let i = 0; i < rawArticles.length; i++) {
    const result = await rewriteArticle(rawArticles[i], i, rawArticles.length);
    if (result) rewritten.push(result);

    await sleep(13000);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(rewritten, null, 2), "utf-8");
  console.log(`\nDone! ${rewritten.length}/${rawArticles.length} articles rewritten.`);
  console.log(`Saved to: ${OUTPUT_PATH}`);
}

main();

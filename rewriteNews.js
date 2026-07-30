require("dotenv").config();
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const Jimp = require("jimp");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require("@supabase/supabase-js");

if (!process.env.GEMINI_API_KEY) {
  console.error("ERROR: GEMINI_API_KEY .env file me nahi mili. Pehle .env set karo.");
  process.exit(1);
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error("ERROR: SUPABASE_URL ya SUPABASE_SERVICE_KEY .env me nahi mili.");
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
}

async function processAndUploadImage(imageUrl, slug) {
  if (!imageUrl) return null;

  try {
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const image = await Jimp.read(Buffer.from(response.data));
    image.flip(true, false);
    image.resize(1200, Jimp.AUTO);

    const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);

    const fileName = `${slug}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(fileName, buffer, { contentType: "image/jpeg" });

    if (uploadError) {
      console.error(`  -> Image upload FAILED: ${uploadError.message}`);
      return null;
    }

    const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (err) {
    console.error(`  -> Image processing FAILED: ${err.message.slice(0, 100)}`);
    return null;
  }
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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
    parsed.imageUrl = article.imageUrl || null;

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

async function saveToSupabase(articles) {
  let successCount = 0;

  for (const a of articles) {
    const slug = slugify(a.title);

    let imageUrl = null;
    if (a.imageUrl) {
      console.log(`  -> Processing image for "${a.title.slice(0, 40)}..."`);
      imageUrl = await processAndUploadImage(a.imageUrl, slug);
    }

    const payload = {
      title: a.title,
      slug,
      category: a.category,
      body: a.body,
      meta_description: a.metaDescription,
      source_name: a.sourceName,
      source_link: a.sourceLink,
      pub_date: a.pubDate,
      is_manual: false,
      status: "published",
    };
    if (imageUrl) payload.image_url = imageUrl;

    const { error } = await supabase.from("posts").upsert(payload, { onConflict: "slug" });

    if (error) {
      console.error(`  -> Supabase insert FAILED for "${a.title.slice(0, 40)}...": ${error.message}`);
    } else {
      successCount++;
    }
  }

  return successCount;
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

  console.log(`\nSaving ${rewritten.length} articles to Supabase...`);
  const saved = await saveToSupabase(rewritten);

  console.log(`\nDone! ${rewritten.length}/${rawArticles.length} articles rewritten.`);
  console.log(`${saved}/${rewritten.length} articles saved to Supabase.`);
  console.log(`Local backup: ${OUTPUT_PATH}`);
}

main();

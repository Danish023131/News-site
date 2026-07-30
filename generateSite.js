// generateSite.js
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const SITE_NAME = "Pulse Wire";
const SITE_TAGLINE = "Signal over noise.";
const SITE_URL = "https://example.com";

const OUTPUT_DIR = path.join(__dirname, "docs");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
}

function escapeHtml(str = "") {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function paragraphs(body = "") {
  return body.split(/\n+/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${escapeHtml(p)}</p>`).join("\n");
}

const CSS = `
:root {
  --paper: #F7F7F5;
  --ink: #14161C;
  --muted: #6B7280;
  --line: #E2E4E9;
  --signal: #3D5AFE;
  --live: #FF4D2E;
  --card: #FFFFFF;
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Inter', -apple-system, sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--paper); color: var(--ink); font-family: var(--font-body); line-height: 1.6; }
a { color: inherit; text-decoration: none; }
img { max-width: 100%; display: block; }
.ticker-wrap { background: var(--ink); color: var(--paper); overflow: hidden; white-space: nowrap; padding: 8px 0; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.03em; }
.ticker { display: inline-block; padding-left: 100%; animation: scroll-left 45s linear infinite; }
@media (prefers-reduced-motion: reduce) { .ticker { animation: none; padding-left: 20px; } }
.ticker span { margin-right: 48px; }
.ticker span::before { content: "\\25CF "; color: var(--live); }
@keyframes scroll-left { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
header.site-header { border-bottom: 1px solid var(--line); padding: 20px 24px; display: flex; justify-content: space-between; align-items: baseline; max-width: 1200px; margin: 0 auto; }
.logo { font-family: var(--font-display); font-size: 28px; font-weight: 600; letter-spacing: -0.02em; }
.logo .dot { color: var(--live); }
.tagline { font-family: var(--font-mono); font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
nav.categories { max-width: 1200px; margin: 0 auto; padding: 12px 24px; display: flex; gap: 20px; flex-wrap: wrap; font-family: var(--font-mono); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid var(--line); }
nav.categories a { color: var(--muted); }
nav.categories a:hover { color: var(--signal); }
main { max-width: 1200px; margin: 0 auto; padding: 32px 24px 64px; }
.eyebrow { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--signal); display: inline-block; margin-bottom: 8px; }
.bento { display: grid; grid-template-columns: 1.6fr 1fr; gap: 24px; margin-bottom: 48px; }
.featured { background: var(--card); border: 1px solid var(--line); border-radius: 4px; padding: 32px; }
.featured h1 { font-family: var(--font-display); font-size: 36px; line-height: 1.15; margin: 8px 0 16px; }
.featured p.dek { color: var(--muted); font-size: 16px; margin-bottom: 12px; }
.side-list { display: flex; flex-direction: column; gap: 20px; }
.side-card { background: var(--card); border: 1px solid var(--line); border-radius: 4px; padding: 20px; }
.side-card h3 { font-family: var(--font-display); font-size: 18px; line-height: 1.3; margin: 6px 0 4px; }
.meta { font-family: var(--font-mono); font-size: 11px; color: var(--muted); text-transform: uppercase; }
.category-section { margin-bottom: 48px; }
.category-title { font-family: var(--font-display); font-size: 22px; border-bottom: 2px solid var(--ink); padding-bottom: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: baseline; }
.category-title a { font-family: var(--font-mono); font-size: 11px; color: var(--signal); text-transform: uppercase; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 4px; padding: 18px; transition: border-color 0.15s ease; }
.card:hover { border-color: var(--signal); }
.card h4 { font-family: var(--font-display); font-size: 17px; line-height: 1.3; margin: 6px 0 8px; }
.card p { color: var(--muted); font-size: 14px; }
.article-page { max-width: 720px; margin: 0 auto; padding: 40px 24px; }
.article-page h1 { font-family: var(--font-display); font-size: 40px; line-height: 1.15; margin: 12px 0 20px; }
.article-body { font-size: 18px; }
.article-body p { margin-bottom: 20px; }
.source-note { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 13px; color: var(--muted); }
.back-link { font-family: var(--font-mono); font-size: 12px; color: var(--signal); text-transform: uppercase; display: inline-block; margin-bottom: 24px; }
.ad-slot { border: 1px dashed var(--line); color: var(--muted); text-align: center; padding: 24px; font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; margin: 32px 0; }
footer { border-top: 1px solid var(--line); padding: 32px 24px; text-align: center; color: var(--muted); font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
@media (max-width: 800px) { .bento { grid-template-columns: 1fr; } .featured h1 { font-size: 28px; } .article-page h1 { font-size: 28px; } }
`;

function headHtml(title, description) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
</head>
<body>`;
}

function tickerHtml(articles) {
  const items = articles.slice(0, 10).map((a) => `<span>${escapeHtml(a.title)}</span>`).join("");
  return `<div class="ticker-wrap"><div class="ticker">${items}${items}</div></div>`;
}

function headerHtml(categories, articles) {
  const navLinks = categories.map((c) => `<a href="/category/${slugify(c)}.html">${escapeHtml(c)}</a>`).join("");
  return `
${tickerHtml(articles)}
<header class="site-header">
  <div>
    <div class="logo">${escapeHtml(SITE_NAME)}<span class="dot">.</span></div>
    <div class="tagline">${escapeHtml(SITE_TAGLINE)}</div>
  </div>
</header>
<nav class="categories">
  <a href="/">Home</a>
  ${navLinks}
</nav>`;
}

function footerHtml() {
  return `<footer>${escapeHtml(SITE_NAME)} \u2014 Updated automatically \u00b7 ${new Date().getFullYear()}</footer>`;
}

function articleCardBig(a) {
  return `
<div class="featured">
  <span class="eyebrow">${escapeHtml(a.category)}</span>
  <a href="/article/${a.slug}.html"><h1>${escapeHtml(a.title)}</h1></a>
  <p class="dek">${escapeHtml(a.metaDescription)}</p>
  <div class="meta">${escapeHtml(a.sourceName)} \u00b7 ${formatDate(a.pubDate)}</div>
</div>`;
}

function articleCardSide(a) {
  return `
<div class="side-card">
  <span class="eyebrow">${escapeHtml(a.category)}</span>
  <a href="/article/${a.slug}.html"><h3>${escapeHtml(a.title)}</h3></a>
  <div class="meta">${formatDate(a.pubDate)}</div>
</div>`;
}

function articleCardGrid(a) {
  const thumb = a.imageUrl
    ? `<img src="${escapeHtml(a.imageUrl)}" alt="" style="width:100%;height:140px;object-fit:cover;border-radius:4px;margin-bottom:10px;">`
    : "";
  return `
<div class="card">
  ${thumb}
  <span class="eyebrow">${escapeHtml(a.category)}</span>
  <a href="/article/${a.slug}.html"><h4>${escapeHtml(a.title)}</h4></a>
  <p>${escapeHtml(a.metaDescription)}</p>
</div>`;
}

function buildHomepage(articles, categories) {
  const [top, ...rest] = articles;
  const sideItems = rest.slice(0, 4).map(articleCardSide).join("");
  const categorySections = categories.map((cat) => {
    const items = articles.filter((a) => a.category === cat).slice(0, 6);
    if (!items.length) return "";
    return `
<section class="category-section">
  <div class="category-title">
    <span>${escapeHtml(cat)}</span>
    <a href="/category/${slugify(cat)}.html">View all \u2192</a>
  </div>
  <div class="card-grid">${items.map(articleCardGrid).join("")}</div>
</section>`;
  }).join("");

  return `${headHtml(`${SITE_NAME} \u2014 ${SITE_TAGLINE}`, SITE_TAGLINE)}
${headerHtml(categories, articles)}
<main>
  <div class="bento">
    ${articleCardBig(top)}
    <div class="side-list">${sideItems}</div>
  </div>
  ${categorySections}
</main>
${footerHtml()}
</body></html>`;
}

function buildCategoryPage(cat, articles, categories) {
  const items = articles.filter((a) => a.category === cat);
  return `${headHtml(`${cat} \u2014 ${SITE_NAME}`, `Latest ${cat} news on ${SITE_NAME}`)}
${headerHtml(categories, articles)}
<main>
  <section class="category-section">
    <div class="category-title"><span>${escapeHtml(cat)}</span></div>
    <div class="card-grid">${items.map(articleCardGrid).join("")}</div>
  </section>
</main>
${footerHtml()}
</body></html>`;
}

function buildArticlePage(a, categories, allArticles) {
  const imageHtml = a.imageUrl
    ? `<img src="${escapeHtml(a.imageUrl)}" alt="${escapeHtml(a.title)}" style="width:100%;border-radius:4px;margin-bottom:20px;">`
    : "";
  const sourceLine = a.sourceName
    ? `<div class="source-note">Based on reporting originally published by ${escapeHtml(a.sourceName)}.</div>`
    : "";
  return `${headHtml(a.title, a.metaDescription)}
${headerHtml(categories, allArticles)}
<main class="article-page">
  <a class="back-link" href="/">\u2190 Back to ${escapeHtml(SITE_NAME)}</a>
  <span class="eyebrow">${escapeHtml(a.category)}</span>
  <h1>${escapeHtml(a.title)}</h1>
  <div class="meta">${escapeHtml(a.sourceName)} \u00b7 ${formatDate(a.pubDate)}</div>
  ${imageHtml}
  <div class="article-body">${paragraphs(a.body)}</div>
  <div class="ad-slot">Ad space</div>
  ${sourceLine}
</main>
${footerHtml()}
</body></html>`;
}

function buildSitemap(articles) {
  const urls = articles.map((a) => `<url><loc>${SITE_URL}/article/${a.slug}.html</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${SITE_URL}/</loc></url>
${urls}
</urlset>`;
}

async function main() {
  const { data: rows, error } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("pub_date", { ascending: false });

  if (error) {
    console.error("ERROR: Supabase se posts fetch nahi hue:", error.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.error("ERROR: Database me koi published post nahi mila.");
    process.exit(1);
  }

  const articles = rows
    .filter((a) => a && a.title && a.body)
    .map((a) => ({
      title: a.title,
      slug: a.slug,
      category: a.category,
      body: a.body,
      metaDescription: a.meta_description || "",
      imageUrl: a.image_url || "",
      sourceName: a.source_name || "",
      sourceLink: a.source_link || "",
      pubDate: a.pub_date,
    }));

  const categories = [...new Set(articles.map((a) => a.category))];

  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUTPUT_DIR, "article"), { recursive: true });
  fs.mkdirSync(path.join(OUTPUT_DIR, "category"), { recursive: true });

  fs.writeFileSync(path.join(OUTPUT_DIR, "styles.css"), CSS, "utf-8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "index.html"), buildHomepage(articles, categories), "utf-8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "sitemap.xml"), buildSitemap(articles), "utf-8");

  categories.forEach((cat) => {
    fs.writeFileSync(path.join(OUTPUT_DIR, "category", `${slugify(cat)}.html`), buildCategoryPage(cat, articles, categories), "utf-8");
  });

  articles.forEach((a) => {
    fs.writeFileSync(path.join(OUTPUT_DIR, "article", `${a.slug}.html`), buildArticlePage(a, categories, articles), "utf-8");
  });

  console.log(`Site generated: ${articles.length} articles, ${categories.length} categories.`);

  const adminSrc = path.join(__dirname, "admin-src");
  const adminDest = path.join(OUTPUT_DIR, "admin");
  if (fs.existsSync(adminSrc)) {
    fs.mkdirSync(adminDest, { recursive: true });
    fs.copyFileSync(path.join(adminSrc, "index.html"), path.join(adminDest, "index.html"));
    console.log("Admin panel copied to /admin");
  }

  console.log(`Output folder: ${OUTPUT_DIR}`);
}

main();

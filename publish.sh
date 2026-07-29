#!/data/data/com.termux/files/usr/bin/bash
cd ~/news-site || exit 1

echo "===== $(date) - Pipeline start ====="

echo "[1/4] Fetching news..."
node fetchNews.js

echo "[2/4] Rewriting with AI..."
node rewriteNews.js

echo "[3/4] Generating site..."
node generateSite.js

echo "[4/4] Pushing to GitHub..."
git add -A
git commit -m "Auto update: $(date '+%Y-%m-%d %H:%M')" --quiet
git push --quiet

echo "===== $(date) - Pipeline done ====="

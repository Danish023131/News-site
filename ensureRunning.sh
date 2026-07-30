#!/data/data/com.termux/files/usr/bin/bash
cd ~/news-site || exit 1

if pgrep -f "autoloop.sh" > /dev/null; then
  echo "✅ Autoloop already chal raha hai."
else
  echo "⚠️  Autoloop band tha, restart kar raha hoon..."
  nohup bash autoloop.sh > /dev/null 2>&1 &
  sleep 1
  echo "✅ Restart ho gaya."
fi

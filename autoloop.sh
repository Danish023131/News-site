#!/data/data/com.termux/files/usr/bin/bash
cd ~/news-site || exit 1
termux-wake-lock 2>/dev/null

while true; do
  bash publish.sh >> publish.log 2>&1
  echo "Sleeping 6 hours..." >> publish.log
  sleep 21600
done

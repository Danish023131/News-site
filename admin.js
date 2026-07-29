const fs = require("fs");
const path = require("path");
const readline = require("readline");

const CONFIG_PATH = path.join(__dirname, "config.json");

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return { articlesPerCategory: 1 };
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  const config = loadConfig();

  console.log("\n=== Pulse Wire Admin ===");
  console.log(`Abhi setting: har category se ${config.articlesPerCategory} article/din\n`);

  const answer = await ask("Naya number daalo (ya khali chhod ke Enter dabao skip karne ke liye): ");

  if (answer.trim() !== "") {
    const num = parseInt(answer.trim(), 10);
    if (isNaN(num) || num < 1) {
      console.log("Galat number, kuch change nahi hua.");
    } else {
      config.articlesPerCategory = num;
      saveConfig(config);
      console.log(`\nDone! Ab har category se ${num} article/din fetch hongi.`);
    }
  } else {
    console.log("Kuch change nahi hua.");
  }

  rl.close();
}

main();

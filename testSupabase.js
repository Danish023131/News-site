require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_KEY"];
let ok = true;

for (const key of required) {
  if (!process.env[key]) {
    console.log(`❌ MISSING: ${key}`);
    ok = false;
  } else {
    console.log(`✅ Found: ${key} (length: ${process.env[key].length} chars)`);
  }
}

if (!ok) {
  console.log("\nKuch keys missing hain .env me. Pehle wo fix karo.");
  process.exit(1);
}

async function testConnection() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase.from("posts").select("id").limit(1);

  if (error) {
    console.log("\n❌ Connection FAILED:", error.message);
  } else {
    console.log("\n✅ Connection SUCCESS! 'posts' table accessible.");
    console.log(`   Rows found: ${data.length}`);
  }
}

testConnection();

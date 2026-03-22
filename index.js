import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Get input (file or stdin)
async function getInput() {
  const filePath = process.argv[2];

  if (filePath) {
    try {
      return fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      console.error("❌ Error reading file:", err.message);
      process.exit(1);
    }
  }

  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", chunk => data += chunk);
    process.stdin.on("end", () => resolve(data));
  });
}

async function summarize(text) {
  if (!text.trim()) {
    console.error("❌ No input provided");
    process.exit(1);
  }

  const prompt = `
You must return ONLY valid JSON. Do not include any explanation.

Format:
{
  "summary": "one sentence",
  "key_points": ["point1", "point2", "point3"],
  "sentiment": "positive | neutral | negative"
}

Text:
${text}
`;

  try {
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const output = response.choices[0].message.content;

    // 🔥 Safe JSON extraction
    const cleaned = output.match(/{[\s\S]*}/);

    if (!cleaned) {
      console.error("❌ Invalid JSON response from API");
      process.exit(1);
    }

    return JSON.parse(cleaned[0]);

  } catch (err) {
    console.error("❌ API Error:", err.message);
    process.exit(1);
  }
}

function printResult(result) {
  console.log("\n📊 Structured Summary\n");

  console.log("📝 Summary:");
  console.log(result.summary);

  console.log("\n🔑 Key Points:");
  result.key_points.forEach((point, i) => {
    console.log(`${i + 1}. ${point}`);
  });

  console.log("\n💡 Sentiment:");
  console.log(result.sentiment.toUpperCase());
}

(async () => {
  const inputText = await getInput();
  const result = await summarize(inputText);
  printResult(result);
})();
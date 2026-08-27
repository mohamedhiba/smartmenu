/**
 * Generate the seven category photos once, into public/dishes/.
 *
 *   node scripts/generate-category-photos.mjs
 *
 * Why a script and not the API route: generating on demand costs a daily-quota
 * request and several seconds, on the Smart Menu screen - the one we least want
 * to slow down during a demo. Run this once, commit the files, and the route
 * serves them statically for ever after. It skips any category already present,
 * so it is safe to re-run after a partial failure.
 *
 * Image generation is on a separate per-day free-tier quota from text. If every
 * key is spent you will see 429 GenerateRequestsPerDayPerProjectPerModel; wait
 * for the daily reset rather than burning the other keys.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
const OUT = path.join(process.cwd(), "public", "dishes");

const PROMPTS = {
  pasta: "A professional overhead food photograph of a plate of pasta, restaurant menu style, appetizing, natural light, shallow depth of field",
  fish: "A professional overhead food photograph of a cooked fish dish, restaurant menu style, appetizing, natural light, shallow depth of field",
  meat: "A professional overhead food photograph of a cooked meat dish, restaurant menu style, appetizing, natural light, shallow depth of field",
  risotto: "A professional overhead food photograph of a bowl of risotto, restaurant menu style, appetizing, natural light, shallow depth of field",
  dessert: "A professional overhead food photograph of a plated dessert, restaurant menu style, appetizing, natural light, shallow depth of field",
  salad: "A professional overhead food photograph of a fresh salad, restaurant menu style, appetizing, natural light, shallow depth of field",
  other: "A professional overhead food photograph of a beautifully plated restaurant dish, appetizing, natural light, shallow depth of field",
};

function envKeys() {
  const env = {};
  if (existsSync(".env.local")) {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const i = line.indexOf("=");
      if (i > 0 && !line.trim().startsWith("#")) {
        env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      }
    }
  }
  return [
    process.env.GEMINI_API_KEY ?? env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2 ?? env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3 ?? env.GEMINI_API_KEY_3,
  ]
    .flatMap((v) => (v ?? "").split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

const keys = envKeys();
if (keys.length === 0) {
  console.error("No GEMINI_API_KEY found in the environment or .env.local");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
let made = 0;
let skipped = 0;
let failed = 0;

for (const [category, prompt] of Object.entries(PROMPTS)) {
  const target = path.join(OUT, `${category}.png`);
  if (existsSync(target)) {
    console.log(`  ${category.padEnd(8)} already present, skipping`);
    skipped++;
    continue;
  }

  let done = false;
  for (const key of keys) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      const img = res.candidates?.[0]?.content?.parts?.find(
        (p) => p.inlineData,
      )?.inlineData;

      if (!img?.data) throw new Error("no image in response");

      writeFileSync(target, Buffer.from(img.data, "base64"));
      console.log(`  ${category.padEnd(8)} written (${Math.round(Buffer.from(img.data, "base64").length / 1024)}KB)`);
      made++;
      done = true;
      break;
    } catch (error) {
      const message = String(error?.message ?? error);
      // A spent key is worth stepping past; anything else will repeat.
      if (!message.includes("429") && !message.includes("quota")) {
        console.log(`  ${category.padEnd(8)} failed: ${message.slice(0, 110)}`);
        break;
      }
    }
  }

  if (!done) {
    console.log(`  ${category.padEnd(8)} skipped - every key is out of daily image quota`);
    failed++;
  }
}

console.log(`\n${made} written, ${skipped} already there, ${failed} unavailable.`);
if (failed > 0) {
  console.log("Daily image quota resets on its own. Re-run then - it skips what exists.");
}

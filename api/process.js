// api/process.js
// Vercel serverless function (Vite project — not Next.js, so this
// lives at the repo root in /api, not app/api/.../route.js).
// Receives raw messages + a profile, extracts each with Gemini, then
// threads and ranks the results. This is the only place the Gemini
// key is read — never expose it to the browser.

import { buildExtractionPrompt } from "../lib/prompt.js";
import { thread } from "../lib/thread.js";
import { rank, findClashes } from "../lib/rank.js";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

async function extractOne(message, today) {
  const prompt = buildExtractionPrompt({
    text: message.text,
    sender: message.sender,
    channel: message.channel,
    sent_at: message.sent_at,
    id: message.id,
    today,
  });

  const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error for ${message.id}: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!raw) {
    throw new Error(`No content returned for message ${message.id}`);
  }

  let item;
  try {
    item = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Bad JSON for message ${message.id}: ${raw}`);
  }

  if (!item.source_ids) item.source_ids = [message.id];

  return item;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed, use POST" });
  }

  try {
    const { messages, profile } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages must be a non-empty array" });
    }
    if (!profile) {
      return res.status(400).json({ error: "profile is required" });
    }

    const today = new Date().toISOString();

    // Extract every message in small batches so a 50-message corpus
    // doesn't hammer the API all at once.
    const BATCH_SIZE = 5;
    const rawItems = [];
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((m) => extractOne(m, today))
      );
      rawItems.push(...results);
    }

    // Plain JS from here — no AI. Thread duplicates/updates, rank and
    // assign lanes, then flag same-day clashes.
    const threaded = await thread(rawItems);
    const ranked = rank(threaded, profile);
    const finalItems = findClashes(ranked);

    return res.status(200).json({ items: finalItems });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

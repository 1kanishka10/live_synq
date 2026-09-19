// api/extract.js
// Stage 1 only: raw messages in, structured records out.
// Called repeatedly from the browser in small chunks so no single
// invocation runs past Vercel's function timeout.

import { buildExtractionPrompt } from "../lib/prompt.js";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";
const MAX_CHUNK = 8;

async function extractOne(message, today) {
  const prompt = buildExtractionPrompt({
    text: message.text,
    sender: message.sender,
    channel: message.channel,
    sent_at: message.sent_at,
    id: message.id,
    today,
  });

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  // 503 means the model is busy; 429 means we are over the per-minute quota.
  // The old loop only retried 503, so on a fifty-message import most calls came
  // back 429, threw immediately, and were reported to the user as "unreadable"
  // when in fact they were simply sent too fast.
  let res;
  for (let attempt = 0; attempt < 5; attempt++) {
    res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body,
    });

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === 4) break;

    // Honour Retry-After when the API sends one, otherwise exponential backoff
    // with jitter so parallel calls don't all wake up at the same instant.
    const after = Number(res.headers.get("retry-after"));
    const wait = Number.isFinite(after) && after > 0
      ? Math.min(after * 1000, 8000)
      : Math.min(600 * 2 ** attempt, 8000) + Math.random() * 400;
    await new Promise((r) => setTimeout(r, wait));
  }

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("RATE_LIMIT: over the model's per-minute quota");
    throw new Error(`Gemini ${res.status}: ${text}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Empty response");

  const item = JSON.parse(raw);

  // The model returns meaning. Everything factual about the message —
  // who sent it, where, when, and the raw text — comes from the message
  // itself. threading and embedding both read these.
  return {
    ...item,
    id: message.id,
    text: message.text,
    sender: message.sender,
    channel: message.channel,
    sent_at: message.sent_at,
    source_ids: item.source_ids ?? [message.id],
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { messages, today } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages must be a non-empty array" });
    }
    if (messages.length > MAX_CHUNK) {
      return res
        .status(400)
        .json({ error: `Send at most ${MAX_CHUNK} messages per request` });
    }

    const stamp = today || new Date().toISOString();

    // One bad message must not lose the whole chunk — but neither should the
    // whole chunk leave at once. Three at a time keeps us under the free-tier
    // rate limit while still being far faster than one by one.
    const settled = [];
    const LANES = 3;
    for (let i = 0; i < messages.length; i += LANES) {
      const batch = await Promise.allSettled(
        messages.slice(i, i + LANES).map((m) => extractOne(m, stamp))
      );
      settled.push(...batch);
    }

    const records = [];
    const failed = [];
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") records.push(r.value);
      else failed.push({ id: messages[i].id, error: String(r.reason?.message ?? r.reason) });
    });

    return res.status(200).json({ records, failed });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

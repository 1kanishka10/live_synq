// api/extract.js
// Stage 1 only: raw messages in, structured records out.
// Called repeatedly from the browser in small chunks so no single
// invocation runs past Vercel's function timeout.

import { buildExtractionPrompt, buildBatchPrompt } from "../lib/prompt.js";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";
const MAX_CHUNK = 8;

// One HTTP call, with the retry policy. Used by both the batch and the
// single-message fallback.
async function callGemini(prompt) {
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

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
  return JSON.parse(raw);
}

// The model returns meaning. Everything factual about a message — who sent it,
// where, when, and the raw text — comes from the message itself, because
// threading and embedding both read these.
function merge(item, message) {
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

async function extractOne(message, today) {
  const item = await callGemini(
    buildExtractionPrompt({
      text: message.text,
      sender: message.sender,
      channel: message.channel,
      sent_at: message.sent_at,
      id: message.id,
      today,
    })
  );
  return merge(item, message);
}

// All the messages in one call. Falls back to single calls only for ids the
// model failed to return, which is rare and cheap.
async function extractBatch(messages, today) {
  const records = [];
  const failed = [];

  let parsed;
  try {
    parsed = await callGemini(buildBatchPrompt({ messages, today }));
  } catch (err) {
    // The batch call itself failed — fall back to one call per message so a
    // single malformed response doesn't cost the whole chunk.
    const settled = [];
    for (let i = 0; i < messages.length; i += 3) {
      settled.push(
        ...(await Promise.allSettled(
          messages.slice(i, i + 3).map((m) => extractOne(m, today))
        ))
      );
    }
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") records.push(r.value);
      else failed.push({ id: messages[i].id, error: String(r.reason?.message ?? r.reason) });
    });
    return { records, failed };
  }

  const list = Array.isArray(parsed) ? parsed : parsed?.items ?? [];
  const byId = new Map(list.filter((x) => x && x.id).map((x) => [String(x.id), x]));

  const missing = [];
  messages.forEach((m, i) => {
    // Prefer the id the model echoed back; fall back to position if it dropped
    // the id but returned the right number of objects.
    const item = byId.get(m.id) ?? (list.length === messages.length ? list[i] : null);
    if (item) records.push(merge(item, m));
    else missing.push(m);
  });

  if (missing.length) {
    const settled = await Promise.allSettled(missing.map((m) => extractOne(m, today)));
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") records.push(r.value);
      else failed.push({ id: missing[i].id, error: String(r.reason?.message ?? r.reason) });
    });
  }

  return { records, failed };
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

    const { records, failed } = await extractBatch(messages, stamp);

    return res.status(200).json({ records, failed });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

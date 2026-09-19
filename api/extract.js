// api/extract.js
// Stage 1 only: raw messages in, structured records out.
// Called repeatedly from the browser in small chunks so no single
// invocation runs past Vercel's function timeout.

import { buildExtractionPrompt } from "../lib/prompt.js";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";
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

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);

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

    // One bad message must not lose the whole chunk.
    const settled = await Promise.allSettled(
      messages.map((m) => extractOne(m, stamp))
    );

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

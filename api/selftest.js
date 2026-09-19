// api/selftest.js
// Runs one fixed message through extraction so the pipeline can be verified
// from a browser address bar. Safe to keep — it sends no user data.

import { buildExtractionPrompt } from "../lib/prompt.js";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const SAMPLE = {
  id: "selftest_1",
  text:
    "*GDG IGDTUW RECRUITMENT 2026* We are looking for Tech Circle Managers and Core Team members. Open to all years. Deadline : 20th September 2026, 11:59 PM",
  sender: "GDG IGDTUW",
  channel: "Self test",
  sent_at: "2026-09-14T10:00:00+05:30",
};

export default async function handler(req, res) {
  const started = Date.now();
  try {
    const prompt = buildExtractionPrompt({
      text: SAMPLE.text,
      sender: SAMPLE.sender,
      channel: SAMPLE.channel,
      sent_at: SAMPLE.sent_at,
      id: SAMPLE.id,
      today: new Date().toISOString(),
    });

    const r = await fetch(GEMINI_URL, {
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

    const raw = await r.text();

    if (!r.ok) {
      return res.status(200).json({
        ok: false,
        stage: "gemini",
        httpStatus: r.status,
        detail: raw.slice(0, 400),
        ms: Date.now() - started,
      });
    }

    const data = JSON.parse(raw);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return res.status(200).json({
      ok: true,
      ms: Date.now() - started,
      extracted: text ? JSON.parse(text) : null,
    });
  } catch (e) {
    return res.status(200).json({
      ok: false,
      stage: "handler",
      detail: String(e.message).slice(0, 400),
      ms: Date.now() - started,
    });
  }
}

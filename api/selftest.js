// api/selftest.js
// ?list=1        → what models this key can reach
// ?model=NAME    → run one extraction against that model
// Safe to keep. Sends no user data.

import { buildExtractionPrompt } from "../lib/prompt.js";

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-3.6-flash";

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
  const key = process.env.GEMINI_API_KEY;

  try {
    if (req.query.list) {
      const r = await fetch(`${BASE}/models`, {
        headers: { "x-goog-api-key": key },
      });
      const body = await r.json();
      return res.status(200).json({
        ok: r.ok,
        httpStatus: r.status,
        models: (body.models || [])
          .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
          .map((m) => m.name),
        embedModels: (body.models || [])
          .filter((m) => (m.supportedGenerationMethods || []).includes("embedContent"))
          .map((m) => m.name),
        ms: Date.now() - started,
      });
    }

    const model = req.query.model || DEFAULT_MODEL;

    const prompt = buildExtractionPrompt({
      text: SAMPLE.text,
      sender: SAMPLE.sender,
      channel: SAMPLE.channel,
      sent_at: SAMPLE.sent_at,
      id: SAMPLE.id,
      today: new Date().toISOString(),
    });

    const r = await fetch(`${BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    const raw = await r.text();

    if (!r.ok) {
      return res.status(200).json({
        ok: false,
        model,
        stage: "gemini",
        httpStatus: r.status,
        detail: raw.slice(0, 300),
        ms: Date.now() - started,
      });
    }

    const data = JSON.parse(raw);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return res.status(200).json({
      ok: true,
      model,
      ms: Date.now() - started,
      extracted: text ? JSON.parse(text) : null,
    });
  } catch (e) {
    return res.status(200).json({
      ok: false,
      stage: "handler",
      detail: String(e.message).slice(0, 300),
      ms: Date.now() - started,
    });
  }
}

// api/finalize.js
// Stages 2 and 3: every extracted record arrives at once so threading
// sees the whole corpus. Embedding calls run in parallel, so this stays
// well inside the timeout even with fifty messages.

import { thread } from "../lib/thread.js";
import { rank, findClashes } from "../lib/rank.js";
import { assessAll } from "../lib/trust.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { records, profile, messagesIn } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "records must be a non-empty array" });
    }
    if (!profile) {
      return res.status(400).json({ error: "profile is required" });
    }

    // Kept for the dashboard: what was set aside, and why.
    const noise = records
      .filter((r) => r.type === "noise")
      .map((r) => ({
        id: r.id,
        why: r.issue || r.uncertainty || "Not actionable.",
        channel: r.channel ?? null,
      }));

    const threaded = await thread(records);
    const ranked = rank(threaded, profile);
    const clashed = findClashes(ranked);

    // Stage 4: corroboration check. Runs last, because it reads how many
    // independent sources threading found for each item. Nothing is removed
    // here — items are annotated, never dropped.
    const items = assessAll(clashed);

    const signal = records.length - noise.length;

    const stats = {
      messages_in: messagesIn ?? records.length,
      threads: items.filter((i) => (i.sources?.length ?? 0) > 1).length,
      duplicates_collapsed: Math.max(0, signal - items.length),
      noise_dropped: noise.length,
      items_total: items.length,
      needs_verifying: items.filter((i) => i.trust?.status === "verify").length,
    };

    return res.status(200).json({ items, stats, noise });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

// thread.js — groups extracted records into items, resolves supersession.
// Input:  records from the LLM extraction pass (one per message)
// Output: one item per real-world subject, newest intent winning

import { getEmbedding, cosineSimilarity } from "./embed.js";

const SIMILARITY_THRESHOLD = 0.74;
const INTENT_RANK = { cancel: 4, extend: 3, update: 2, new: 1 };

export async function thread(records) {
  // 1. Drop noise before grouping — it has no refers_to worth keeping.
  const signal = records.filter(r => r.type !== "noise");

  // 1.5 Get embeddings for every remaining record, so we can catch
  //     duplicates the model's own refers_to field missed.
  // Five at a time rather than all at once: a fifty-message import used to
  // fire every embedding request simultaneously, which is the second way to
  // trip the per-minute quota.
  const withEmbeddings = [];
  const LANES = 5;
  for (let i = 0; i < signal.length; i += LANES) {
    const batch = await Promise.all(
      signal.slice(i, i + LANES).map(async (r) => ({
        ...r,
        embedding: await getEmbedding(
          [r.refers_to, r.title, r.plain].filter(Boolean).join(" · ") || r.text || ""
        ),
      }))
    );
    withEmbeddings.push(...batch);
  }

  // 1.6 Assign every record a canonical key. Start from refers_to/id,
  //     then merge in anything semantically close enough to count as
  //     the same real-world subject.
  const canonicalKey = new Map(); // record.id -> shared key

  for (let i = 0; i < withEmbeddings.length; i++) {
    const a = withEmbeddings[i];
    if (canonicalKey.has(a.id)) continue;

    const key = (a.refers_to || a.id).trim().toLowerCase();
    canonicalKey.set(a.id, key);

    for (let j = i + 1; j < withEmbeddings.length; j++) {
      const b = withEmbeddings[j];
      if (canonicalKey.has(b.id)) continue;

      const sim = cosineSimilarity(a.embedding, b.embedding);
      if (sim >= SIMILARITY_THRESHOLD) {
        canonicalKey.set(b.id, key);
      }
    }
  }

  // 2. Group by the canonical subject the model (or the embedding pass) produced.
  const groups = new Map();
  for (const r of withEmbeddings) {
    const key = canonicalKey.get(r.id);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  // 3. Collapse each group into one item.
  return [...groups.values()].map(group => {
    // Oldest first, so history reads in order.
    group.sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));

    // The winning record is the strongest intent; ties break on recency.
    const winner = [...group].sort((a, b) => {
      const d = (INTENT_RANK[b.intent] || 1) - (INTENT_RANK[a.intent] || 1);
      return d !== 0 ? d : new Date(b.sent_at) - new Date(a.sent_at);
    })[0];

    return {
      ...winner,
      sources: group.map(r => ({
        id: r.id, channel: r.channel, sender: r.sender,
        sent_at: r.sent_at, excerpt: r.text.slice(0, 120),
      })),
      // Nothing is discarded — the whole chain stays reachable.
      history: group.length > 1
        ? group.map(r => ({ at: r.sent_at, what: r.plain, intent: r.intent }))
        : null,
      supersedes: group.filter(r => r.id !== winner.id).map(r => r.id),
      embedding: undefined, // internal only — don't leak it in the API response
    };
  });
}

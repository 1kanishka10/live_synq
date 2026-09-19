// The pipeline and the UI speak different vocabularies. The pipeline returns one
// flat list of items in snake_case (lane, plain, deadline_text, hours_left). The
// screens read five camelCase arrays plus a stats object. This translates.
//
// Anything the pipeline genuinely doesn't know is left null rather than invented.

const DAY = 86400000;

function mapSources(sources = []) {
  return sources.map((s) => ({
    id: s.id,
    channel: s.channel,
    sender: s.sender,
    sentAt: s.sent_at ?? s.sentAt ?? null,
    excerpt: s.excerpt,
  }));
}

// The channel an item was first seen in — used as the card's tag.
function primaryChannel(item) {
  return item.sources?.[0]?.channel ?? "Unknown channel";
}

function eligibilityOf(item) {
  const a = item.audience || {};
  const bits = [];
  if (a.years?.length) bits.push(`Year ${a.years.join(", ")}`);
  if (a.branches?.length) bits.push(a.branches.join(", "));
  return bits.length ? bits.join(" · ") : "Open to all years and branches";
}

// Why an item surfaced: how long it sat unseen, and where.
function whyHere(item, now) {
  const first = item.sources?.[0];
  if (!first?.sent_at) return null;
  const age = Math.round((now - new Date(first.sent_at)) / DAY);
  const count = item.sources.length;
  if (count > 1) {
    return `Announced ${count} times across ${
      new Set(item.sources.map((s) => s.channel)).size
    } channels.`;
  }
  return `Posted ${age} day${age === 1 ? "" : "s"} ago in ${first.channel}, and never repeated.`;
}

// Turn clash_with ids into the sentence the card shows. Never asserts an
// overlap the data can't support.
function clashNote(item, byId) {
  if (!item.clash_with?.length) return null;
  const others = item.clash_with.map((id) => byId.get(id)?.title).filter(Boolean);
  if (!others.length) return null;
  const when = item.event_date || (item.deadline || "").slice(0, 10);
  const stem = when
    ? `Also landing on ${when}: ${others.join(", ")}.`
    : `Overlaps with ${others.join(", ")}.`;
  return item.deadline && !item.deadline.includes("T")
    ? `${stem} No start time is given, so an overlap cannot be ruled out.`
    : stem;
}

// Category is read from the title only. Descriptions mention "teams of 4 to 6"
// and similar in passing, which miscategorises if you match against them.
function categoryOf(item) {
  const t = (item.title || "").toLowerCase();
  if (/scholarship|fee|stipend|book bank|library/.test(t)) return "Scholarship";
  if (/audition|fest|cultural|dance|music|drama|orientation/.test(t)) return "Cultural";
  if (/\bteam\b|spot open|looking for a member/.test(t)) return "Team";
  return "Academic";
}

// 1st, 2nd, 3rd, 4th — the old template appended "st" to every number.
function ordinal(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return String(n);
  const s = ["th", "st", "nd", "rd"];
  return v + (s[(v % 100 - 20) % 10] || s[v % 100] || s[0]);
}

function typeOf(item) {
  if (item.type === "opportunity") return "Opportunity";
  if (item.type === "event") return "Event";
  return "Academic";
}

export function adapt(payload, opts = {}) {
  const now = opts.now ? new Date(opts.now) : new Date();
  const items = payload.items ?? payload ?? [];
  const noise = payload.noise ?? [];
  const pipelineStats = payload.stats ?? {};

  const byId = new Map(items.map((i) => [i.id, i]));

  const base = (item) => ({
    id: item.id,
    title: item.title,
    description: item.plain ?? null,
    confidence: item.confidence ?? "missing",
    uncertainty: item.uncertainty ?? null,
    issue: item.issue ?? null,
    deadlineText: item.deadline_text ?? null,
    sources: mapSources(item.sources),
    sourceCount: item.sources?.length ?? 0,
    trust: item.trust ?? null,
  });

  const deadlines = items
    .filter((i) => i.lane === "now")
    .map((item) => ({
      ...base(item),
      tag: primaryChannel(item),
      dueInHours: item.hours_left ?? null,
      actionLink: item.link ?? null,
      contact: null,
      submission: item.action ?? null,
      rank: item.rank ?? 99,
      consequence: item.consequence ?? null,
      location: item.location ?? null,
            clashNote: item.clash_note ?? clashNote(item, byId),
      history: item.history ?? null,
    }));

  const opportunities = items
    .filter((i) => i.lane === "discover")
    .map((item) => ({
      ...base(item),
      category: categoryOf(item),
      eligibility: eligibilityOf(item),
      deadline: item.deadline ? item.deadline.slice(0, 10) : null,
      whyHere: whyHere(item, now),
      actionLink: item.link ?? null,
    }));

  const missed = items
    .filter((i) => i.lane === "missed")
    .map((item) => ({
      ...base(item),
      tag: primaryChannel(item),
    }));

  // Items that could not be corroborated. These are a VIEW, not a lane — each
  // one also stays in the lane it earned, and in the announcements feed. Synq
  // surfaces what does not check out; it does not take the decision away, and
  // it does not delete anything.
  const verify = items
    .filter((i) => i.trust?.status === "verify")
    .map((item) => ({
      ...base(item),
      tag: primaryChannel(item),
      lane: item.lane,
      category: categoryOf(item),
      deadline: item.deadline ? item.deadline.slice(0, 10) : null,
      actionLink: item.link ?? null,
    }));

  // Every kept item also appears in the searchable announcements feed.
  const announcements = items.map((item) => {
    const a = item.audience || {};
    const first = item.sources?.[0];
    return {
      ...base(item),
      summary: item.plain ?? null,
      department: a.branches?.length ? a.branches.join(", ") : "All Departments",
      year: a.years?.length ? `${ordinal(a.years[0])} Year` : "All Years",
      type: typeOf(item),
      date: first?.sent_at ? first.sent_at.slice(0, 10) : null,
      lane: item.lane,
      channel: first?.channel ?? null,
      sender: first?.sender ?? null,
    };
  });

  const stats = {
    messages_in: pipelineStats.messages_in ?? 0,
    threads: pipelineStats.threads ?? 0,
    duplicates_collapsed: pipelineStats.duplicates_collapsed ?? 0,
    noise_dropped: pipelineStats.noise_dropped ?? noise.length,
    now: deadlines.length,
    discover: opportunities.length,
    missed: missed.length,
    needs_verifying: verify.length,
    items_total: items.length,
    noiseExamples: noise.map((n) => ({
      id: n.id,
      why: n.why,
      ...(n.channel ? { channel: n.channel } : {}),
    })),
  };

  return { deadlines, opportunities, announcements, missed, verify, stats };
}

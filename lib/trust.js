// lib/trust.js
//
// Synq never decides whether a message is genuine. It has no way to know, and
// saying so would be inventing a fact — the same sin as inventing a deadline.
//
// What it can do is separate what a message CLAIMS from what can be
// corroborated, name the gap precisely, and hand the reader a next step. A
// college logo and an urgent tone are free to copy. Being repeated by a
// department account, by your class rep, in the channel that normally carries
// that kind of notice, over more than one day, is not.
//
// So the corroboration signal falls out of machinery that already exists: the
// same threading pass that collapses duplicates is what tells us whether
// anybody else ever said this.
//
// The language model upstream only reports observations — does the text ask for
// money, does it name an authority, what links are in it. Every judgment below
// is plain, readable, deterministic code. Run it twice on the same input and
// you get the same answer, which is not true of asking a model "is this a scam".

import { tierOfSender } from "./authority.js";

// Domains a college notice would plausibly point at. Everything else is not
// "bad" — it is merely not institutional, which is worth saying out loud when
// the message is also asking for money or documents.
const INSTITUTIONAL = [
  "igdtuw.ac.in",
  "gov.in",
  "nic.in",
  "ac.in",
  "edu.in",
  "scholarships.gov.in",
  "aicte-india.org",
  "ugc.ac.in",
];

// Fallbacks, in case the extraction pass missed the field. Deliberately narrow:
// a false "asks for money" is a real cost to the student.
const MONEY_RE =
  /\b(?:registration|processing|application|verification|security|service)\s*(?:fee|charge|amount)|\bpay\s*(?:rs\.?|₹|inr)\s*\d|\b(?:₹|rs\.?)\s*\d+\s*(?:only|\/-)?\s*(?:to|for)\b|\bupi\b|\bgpay\b|\bpaytm\b|\bqr code\b/i;

const DOCS_RE =
  /\baadh?aar\b|\bpan card\b|\bbank (?:account|details|passbook)\b|\bifsc\b|\botp\b|\bpassword\b|\bcvv\b|\bmarksheet.{0,20}(?:upload|send|share)/i;

const PRESSURE_RE =
  /\bimmediate(?:ly)?\b|\bwithin \d+ (?:hours?|hrs?|minutes?)\b|\btoday only\b|\blast chance\b|\bact (?:now|fast)\b|\bexpires? (?:today|tonight|in)\b|\bhurry\b|\blimited slots? (?:left|only)\b/i;

// A message that presents itself as an OFFICE of the institution — the thing a
// forged logo is doing. Deliberately narrow: it names the administrative bodies
// that can actually grant or withdraw something.
//
// It must NOT match a society that happens to be named after the college. "GDG
// IGDTUW" and "IEEE IGDTUW Student Branch" are real student bodies, and an
// earlier version of this regex matched the bare word "igdtuw" and flagged them
// as impersonators of their own campus.
const CLAIMS_OFFICE_RE =
  /\bprincipal\b|\bdean\b|\bregistrar\b|\bvice[- ]chancellor\b|\bproctor\b|\bexamination (?:branch|cell|office)\b|\badmin(?:istration)? (?:office|cell|block)\b|\bscholarship (?:office|cell|committee|section)\b|\bplacement cell\b|\baccounts (?:office|section)\b|\bministry\b|\bgovernment of india\b|\buniversity administration\b/i;

function domainOf(raw) {
  if (!raw) return null;
  const s = String(raw).trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const host = s.split(/[/?#\s]/)[0].toLowerCase();
  return host.includes(".") ? host : null;
}

function isInstitutional(host) {
  if (!host) return false;
  return INSTITUTIONAL.some((d) => host === d || host.endsWith(`.${d}`));
}

function textOf(item) {
  return [
    item.title,
    item.plain,
    item.action,
    ...(item.sources || []).map((s) => s.excerpt),
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Assess one threaded item. Returns a `trust` block; never mutates the item.
 *
 * status is "verify" or "ok". There is deliberately no "fake" and no score out
 * of 100 — a number invites the reader to treat a guess as a measurement.
 */
export function assess(item, opts = {}) {
  const institutional = opts.institutionalDomains ?? INSTITUTIONAL;
  const body = textOf(item);
  const sources = item.sources || [];

  // --- corroboration: what the whole corpus says, not just this message ---
  const channels = new Set(sources.map((s) => s.channel).filter(Boolean));
  const topTier = sources.reduce((max, s) => Math.max(max, tierOfSender(s.sender)), 0);
  const corroboration = {
    timesSeen: sources.length,
    channels: channels.size,
    highestAuthority: topTier,
    // The sender as WhatsApp reports it — an unknown number has no tier.
    postedBy: sources[0]?.sender ?? null,
  };

  // --- observations, from the model where available, regex as a backstop ---
  const asksMoney = item.asks_for_money === true || MONEY_RE.test(body);
  const asksDocs = item.asks_for_personal_documents === true || DOCS_RE.test(body);
  const pressure =
    item.pressure_quote || (PRESSURE_RE.test(body) ? body.match(PRESSURE_RE)[0] : null);

  const rawLinks = item.links?.length ? item.links : item.link ? [item.link] : [];
  const hosts = [...new Set(rawLinks.map(domainOf).filter(Boolean))];
  const offsite = hosts.filter(
    (h) => !institutional.some((d) => h === d || h.endsWith(`.${d}`))
  );

  const claimed = item.claimed_source || null;
  // Judged on what the message says it IS, not on every word in its body. A
  // notice can mention the placement cell without claiming to be it.
  const claimsOffice = claimed ? CLAIMS_OFFICE_RE.test(claimed) : false;

  // Impersonation only harms you when it is being used to extract something.
  // Claiming institutional backing is not, by itself, a reason to doubt a
  // message — societies, fests and clubs do it constantly and truthfully.
  const hasPayload = asksMoney || asksDocs || offsite.length > 0;

  const reasons = [];
  const notes = [];

  // --- decisive: things no genuine college or government scholarship does ---
  if (asksMoney) {
    reasons.push({
      code: "payment_requested",
      headline: "It asks you to pay to apply.",
      detail:
        "No government or college scholarship in India charges a fee to apply. A request for a registration, processing or verification payment is the single strongest sign that something is wrong.",
    });
  }

  if (asksDocs && offsite.length) {
    reasons.push({
      code: "documents_offsite",
      headline: "It asks for personal documents through a link outside the college.",
      detail: `Identity documents and bank details are being collected at ${offsite.join(
        ", "
      )}, which is not a college or government domain.`,
    });
  } else if (asksDocs) {
    reasons.push({
      code: "documents_requested",
      headline: "It asks for identity or bank documents.",
      detail:
        "Departments collect these in person or through a portal you already have a login for, not over a chat message.",
    });
  }

  // The logo problem, stated structurally: the message wears an authority the
  // account posting it does not have, AND is using it to ask for something.
  if (claimsOffice && topTier === 0 && hasPayload) {
    reasons.push({
      code: "authority_gap",
      headline: `It presents itself as coming from ${claimed}, but was posted by an unrecognised account.`,
      detail:
        "Synq recognises department, office and class-rep accounts by how they have posted before. This sender matches none of them, and is using that claimed authority to ask you for something. A logo or letterhead proves nothing — both can be copied in seconds.",
    });
  } else if (claimsOffice && topTier === 0) {
    notes.push({
      code: "unverified_claim",
      headline: `It says it is from ${claimed}, but Synq does not recognise the account that posted it.`,
      detail:
        "On its own this is common and usually harmless — someone forwards a notice, or a new account posts for the first time. It is only treated as a problem when the message is also asking for money, documents or a click.",
    });
  }

  // --- context: real, but not enough on its own to doubt a message ---
  if (sources.length === 1) {
    notes.push({
      code: "single_source",
      headline: "Nobody else has mentioned this.",
      detail:
        "It appeared once, in one group. Genuine notices of this size are normally repeated — by the department, by your class rep, on the notice board — over more than one day.",
    });
  }

  if (pressure) {
    notes.push({
      code: "urgency_pressure",
      headline: `It pushes you to act immediately — “${String(pressure).slice(0, 80)}”.`,
      detail:
        "Deadline pressure is how a reader is stopped from checking. A real deadline survives you taking ten minutes to confirm it.",
    });
  }

  if (offsite.length && !asksDocs) {
    notes.push({
      code: "offsite_link",
      headline: `The link goes to ${offsite.join(", ")}.`,
      detail:
        "Not institutional. Plenty of genuine notices use outside forms, so this is context rather than a problem by itself.",
    });
  }

  // --- the decision ---
  // Only a decisive reason moves an item to "verify". Context notes never do it
  // alone: a senior offering a hackathon spot is single-source, unverified and
  // urgent, and is exactly the kind of unexpected opportunity we promised never
  // to bury.
  const status = reasons.length > 0 ? "verify" : "ok";

  return {
    status,
    reasons,
    notes,
    corroboration,
    claimedSource: claimed,
    links: hosts,
    // Deliberately not a verdict.
    summary:
      status === "verify"
        ? "Synq cannot confirm this is genuine, and cannot confirm it is fake. Here is what does not check out."
        : "Nothing about how this arrived contradicts what it claims.",
    checks: status === "verify" ? buildChecks(reasons, notes, claimed, offsite) : [],
  };
}

// The part that actually helps: not a verdict, a next step the reader can take
// in under five minutes without trusting us either.
function buildChecks(reasons, notes, claimed, offsite) {
  const codes = new Set([...reasons, ...notes].map((r) => r.code));
  const out = [];

  if (codes.has("payment_requested")) {
    out.push("Do not pay anything. Fees are never charged to apply for a scholarship.");
  }
  if (codes.has("documents_offsite") || codes.has("documents_requested")) {
    out.push(
      "Do not upload Aadhaar, marksheets or bank details until someone you can name has confirmed the form."
    );
  }
  out.push(
    claimed
      ? `Ask ${claimed} directly, through the channel they normally post in — not by replying to this message.`
      : "Ask your class rep or the department office whether this was actually issued."
  );
  if (offsite.length) {
    out.push(
      `Check the college website or the National Scholarship Portal for the same scheme, rather than opening ${offsite[0]}.`
    );
  }
  out.push(
    "If it is genuine, it will still be genuine tomorrow, and the office will confirm it in writing."
  );
  return out;
}

/** Attach a trust block to every item. */
export function assessAll(items, opts = {}) {
  return items.map((item) => ({ ...item, trust: assess(item, opts) }));
}

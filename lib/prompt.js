// lib/prompt.js
// The extraction system prompt. Called once per raw message.
// Everything the brief asks for that nobody else builds lives in
// these rules — see the ABSOLUTE RULES block.

const SCHEMA = `{
  "id": "string, same as input message id",
  "source_ids": ["array of message ids this refers to — usually just this one"],
  "type": "deadline | event | cancellation | update | opportunity | noise",
  "title": "max 8 words",
  "plain": "max 25 words, plain language",
  "action": "what the student should do, or null",
  "deadline": "ISO datetime, or null",
  "deadline_text": "literal words from the message, quoted exactly, or null",
  "confidence": "stated | inferred | missing",
  "uncertainty": "what is unclear, or null",
  "audience": {
    "years": "array of numbers or null",
    "branches": "array of strings or null",
    "societies": "array of strings or null",
    "hostel_only": "boolean or null"
  },
  "seats_limited": "boolean or null",
  "consequence": "only if the message states what happens on failure, else null",
  "location": "string or null",
  "link": "string or null",
  "links": ["every URL or domain that appears in the message, verbatim; [] if none"],
  "asks_for_money": "boolean — true only if the message asks the reader to pay, transfer, or send a fee, charge, deposit or processing amount",
  "asks_for_personal_documents": "boolean — true only if the message asks for ID documents, Aadhaar, PAN, marksheets, bank details, passwords or OTPs",
  "claimed_source": "the authority the message presents itself as coming from, quoted from the text, or null",
  "pressure_quote": "the literal phrase demanding immediate or urgent action, or null",
  "refers_to": "short lowercase phrase, 3-5 words, canonical subject",
  "intent": "new | update | extend | cancel"
}`;

const RULES = `ABSOLUTE RULES — these override everything else:

1. Every value must come from the message text itself. If the message
   does not say something, the value is null. Never fill a gap from
   general knowledge or from what is typical. A null is a correct
   answer. A plausible guess is a wrong answer.

2. If you work something out from context — a weekday with no date, a
   venue implied by the sender — put it in the field, set confidence
   to "inferred", and write what is unclear in "uncertainty".
   If you cannot work it out at all, use null and confidence "missing".
   Only use confidence "stated" when the message says it outright.

3. deadline_text must be the literal words from the message, quoted
   exactly. Do not tidy them.

4. Never drop specifics. Keep amounts, room numbers, form names,
   links and seat counts exactly as written.

5. "consequence" is only filled if the message states what happens on
   failure. Do not reason about likely consequences. Usually null.

6. refers_to is a short lowercase phrase naming the underlying subject,
   3-5 words, chosen so that every message about the same thing gets
   the same phrase. "nss enrolment", "tech fest auditions".

7. intent: "cancel" if it calls something off, "extend" if it moves a
   deadline later, "update" if it changes details, otherwise "new".

8. OBSERVE, DO NOT JUDGE. asks_for_money, asks_for_personal_documents,
   claimed_source, links and pressure_quote record what the text does.
   They are observations, not accusations. Never write that a message
   is a scam, fake, suspicious or fraudulent anywhere in your output.
   Deciding that is not your job and you do not have the information
   to do it — you see one message, not the whole group.

9. NEVER SUPPRESS A MESSAGE FOR LOOKING SUSPICIOUS. A message that
   asks for money or documents is still extracted normally, with its
   real type. "noise" means chatter with nothing actionable in it —
   it does not mean untrustworthy. A real, life-changing scholarship
   and a fraud can read almost identically, so hiding either one is a
   failure. Extract it, record what it asks for, and let the reader
   decide.

10. claimed_source is who the message SAYS it is from — "the Principal's
    office", "IGDTUW Scholarship Cell" — taken from the text. It is not
    the account that posted it, which you are given separately below.
    If the message makes no such claim, use null.`;

function buildExtractionPrompt({ text, sender, channel, sent_at, id, today }) {
  return `You extract structured data from college announcements.
You receive ONE message. Return ONLY valid JSON. No prose, no markdown.

${RULES}

CONTEXT (use only to resolve relative dates):
  message id:   ${id}
  message sent: ${sent_at}
  today:        ${today}
  sender:       ${sender}
  channel:      ${channel}

MESSAGE TEXT:
"""
${text}
"""

Return exactly this shape:
${SCHEMA}`;
}

// Batch form. One model call per chunk instead of one per message: a
// fifty-message import went from ~52 requests to ~7, which is both far faster
// and the difference between staying inside the free-tier quota and being
// rate-limited out of two thirds of the corpus.
function buildBatchPrompt({ messages, today }) {
  const listed = messages
    .map(
      (m, i) => `--- MESSAGE ${i + 1} ---
  message id:   ${m.id}
  message sent: ${m.sent_at}
  sender:       ${m.sender}
  channel:      ${m.channel}
  text:
  """
  ${m.text}
  """`
    )
    .join("\n\n");

  return `You extract structured data from college announcements.
You receive ${messages.length} messages. Return ONLY a valid JSON array with
exactly ${messages.length} objects, in the same order, one per message. No prose,
no markdown, no wrapper object.

Each object's "id" MUST be the message id given for that message. Never invent
an id and never merge two messages into one object — deduplication happens later
and needs every message returned separately.

${RULES}

today: ${today}

${listed}

Each object in the array must have exactly this shape:
${SCHEMA}`;
}

export { buildExtractionPrompt, buildBatchPrompt };

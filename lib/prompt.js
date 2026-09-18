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
  "refers_to": "short lowercase phrase, 3-5 words, canonical subject",
  "intent": "new | update | extend | cancel"
}`;

function buildExtractionPrompt({ text, sender, channel, sent_at, id, today }) {
  return `You extract structured data from college announcements.
You receive ONE message. Return ONLY valid JSON. No prose, no markdown.

ABSOLUTE RULES — these override everything else:

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

export { buildExtractionPrompt };

# Synq

**Fifty messages in. Five things you actually have to do.**

Synq reads a fresher's campus WhatsApp groups and returns what needs doing —
ranked, deduplicated, and never invented..

Built for SheVibes Vibeathon 2026, Track 3 — *AI for Smarter Campus Information*.

## The problem

A first-year is in eight group chats. The announcement she needs was posted once,
three weeks ago, in a group nobody scrolls back through — or five times in one day
across three groups, so she stops reading any of them. She doesn't fail to find the
answer. She never learns there was a question.

## How it works

Three stages, and only the first is AI:

1. **Extraction — a language model.** Each raw message is read and turned into a
   structured item: what it asks of you, what it costs to ignore, what the deadline
   text literally said, and what the message *fails* to say. That last judgement is
   why this needs a model and not a keyword filter.
2. **Threading — plain code.** Items carrying the same canonical reference are grouped
   and the latest intent wins, with precedence `cancel > extend > update > new`. Five
   forwards of one workshop collapse into one item that remembers all five.
3. **Ranking — arithmetic.** `consequence × time × relevance`. Low-relevance items move
   to a discover lane. Nothing is ever deleted.

Threading and ranking are deliberately not AI: they are inspectable, they cannot
hallucinate, and they run instantly.

## Two rules the product never breaks

**It never invents a missing detail.** If a message says "submit the hardcopy till next
week", Synq shows that sentence in quotes and marks the item *Not confirmed*. It does
not guess a date.

**It never hides an unexpected opportunity.** Items that score low on relevance move to
a discover lane rather than disappearing, because a scholarship a student didn't know
to look for is exactly what gets filtered away everywhere else.

## Data

`src/data/*.json` is the processed output of 50 real messages taken from IGDTUW
first-year group chats, anonymised, with invite links removed. Six of the fifty were
written to cover edge cases — an expired deadline forwarded after it closed, a venue
change posted in a group the affected students weren't in.

Extraction was run ahead of time and committed so the demo cannot fail on a network
call. `lib/thread.js` and `lib/rank.js` are the runtime implementations of stages 2
and 3.

## Stack

Vite · React · Tailwind · deployed on Vercel.

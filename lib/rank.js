// rank.js — scores items and assigns lanes. No AI here, just arithmetic.

const HOUR = 36e5;

// How bad is it to miss this?
function consequenceWeight(item) {
  if (item.type === "deadline" && /exam|assignment|registration|fee|scholarship/i
        .test(item.title)) return 3;          // academic or money
  if (item.type === "opportunity" || item.type === "deadline") return 2;
  return 1;                                    // social, informational
}

// How soon is it?
function timeWeight(hoursLeft) {
  if (hoursLeft == null) return 2.5;           // no date given — assume soon-ish
  if (hoursLeft < 0)   return 0;               // already gone
  if (hoursLeft <= 24) return 4;
  if (hoursLeft <= 72) return 3;
  if (hoursLeft <= 168) return 2;
  if (hoursLeft <= 336) return 1.5;
  return 1;
}

// Does it apply to her?
function relevance(item, profile) {
  const a = item.audience || {};
  if (!a.years && !a.branches) return 0.8;     // audience unstated
  const yearOk   = !a.years    || a.years.includes(profile.year);
  const branchOk = !a.branches || a.branches.includes(profile.branch);
  return yearOk && branchOk ? 1.0 : 0.3;
}

export function rank(items, profile, now = new Date()) {
  const scored = items.map(item => {
    const hoursLeft = item.deadline
      ? Math.round((new Date(item.deadline) - now) / HOUR)
      : null;
    const urgency = consequenceWeight(item) * timeWeight(hoursLeft) * relevance(item, profile);
    return { ...item, hours_left: hoursLeft, urgency: +urgency.toFixed(1) };
  });

  // Lane assignment. Note what does NOT happen: nothing is deleted.
  for (const it of scored) {
    if (it.hours_left != null && it.hours_left < 0) it.lane = "missed";
    else if (relevance(it, profile) < 0.5)          it.lane = "discover";
    else                                             it.lane = "now";
  }

  // Only the top five stay in "now". The rest fall through to discover,
  // because burying something is not the same as hiding it.
  const now_ = scored.filter(i => i.lane === "now").sort((a, b) => b.urgency - a.urgency);
  now_.slice(5).forEach(i => { i.lane = "discover"; });
  now_.slice(0, 5).forEach((i, n) => { i.rank = n + 1; });

  scored.filter(i => i.lane === "discover")
        .sort((a, b) => b.urgency - a.urgency)
        .forEach((i, n) => { i.rank = n + 1; });

  return scored;
}

// Two items clash if they fall on the same calendar day.
// If either has no stated time, we say so rather than guessing.
export function findClashes(items) {
  const byDay = {};
  for (const i of items.filter(i => i.event_date)) {
    (byDay[i.event_date] ||= []).push(i);
  }
  for (const day of Object.values(byDay)) {
    if (day.length < 2) continue;
    for (const i of day) {
      i.clash_with = day.filter(o => o.id !== i.id).map(o => o.id);
      i.clash_note = `${day.length} things fall on ${i.event_date}. `
        + (day.some(o => !o.deadline_text?.match(/\d\s*(AM|PM|:)/i))
            ? "At least one gives no start time, so an overlap cannot be ruled out."
            : "Check the times before committing to both.");
    }
  }
  return items;
}

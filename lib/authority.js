// Who said it matters as much as when it is due.
//
// A notice from the Admin Office with no date can outrank a society post with a
// deadline, because the cost of missing it is real and nobody is chasing you.
// Tiers are read from the sender strings already present in every sources[] entry.

const OFFICIAL = /professor|faculty|admin office|department|scholarship office|central library|examination|placement cell/i;
const REP = /class rep|^cr\b|cr \(|cultural committee|outreach core/i;
// Student bodies rarely have "society" in the name. A chapter or a cell is a
// recognised group even when it is called GDG, IEEE or E-Cell — not an office,
// but not an unknown number either.
const SOCIETY =
  /society|club|committee|chapter|\bgdg\b|\bgoogle developer/i;

export function tierOfSender(sender = "") {
  if (OFFICIAL.test(sender)) return 3;
  if (REP.test(sender)) return 2;
  if (SOCIETY.test(sender)) return 1;
  return 0; // students, seniors, group admins
}

// An item takes the authority of its most authoritative source.
export function authorityOf(item) {
  const tier = (item.sources || []).reduce(
    (max, s) => Math.max(max, tierOfSender(s.sender)),
    0
  );
  const label = tier === 3 ? "Official" : tier === 2 ? "Class rep" : null;
  return { tier, label };
}

// Undated does not mean unimportant, so it scores above zero.
export function urgencyScore(item) {
  if (item.dueInHours != null) {
    if (item.dueInHours < 24) return 3;
    if (item.dueInHours < 72) return 2;
    return 1;
  }
  if (item.deadline) {
    const days = (new Date(item.deadline) - new Date(2026, 8, 15)) / 86400000;
    if (days < 1) return 3;
    if (days < 3) return 2;
    return 1;
  }
  return 0.5;
}

// Authority and urgency both count. Neither can be ignored by the other.
export function priorityOf(item) {
  return authorityOf(item).tier + urgencyScore(item);
}

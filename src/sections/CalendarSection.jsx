import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, HelpCircle, AlertTriangle } from "lucide-react";
import { Card, Badge } from "../components/ui";
import { useData } from "../data/DataContext";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// The sample corpus's dueInHours values are measured from this moment.
// An imported chat is ranked against the real clock instead.
const SAMPLE_SNAPSHOT = new Date(2026, 8, 15, 9, 0);

function fromISO(s) {
  if (!s) return null;
  const [y, m, d] = String(s).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function keyOf(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// Written out in full: Tailwind only keeps classes it can find as literal text.
const DOT = {
  critical: "bg-critical",
  ocean: "bg-ocean",
  medium: "bg-medium",
};

const CHIP = {
  critical: "bg-critical/15",
  ocean: "bg-ocean/15",
  medium: "bg-medium/15",
};

export function CalendarSection({ onNavigate }) {
  const { deadlines = [], opportunities = [], source } = useData();

  // Memoised so it doesn't become a new object on every render.
  const snapshot = useMemo(
    () => (source === "imported" ? new Date() : SAMPLE_SNAPSHOT),
    [source]
  );

  // Everything derived from the dataset is built in one pass, so an import
  // rebuilds the grid, the undated list and the clash panel together.
  const { events, byDay, undated, flagged } = useMemo(() => {
    const events = [];

    deadlines.forEach((d) => {
      if (d.dueInHours == null) return;
      events.push({
        id: `d-${d.id}`,
        rawId: d.id,
        date: new Date(snapshot.getTime() + d.dueInHours * 3600 * 1000),
        kind: "Deadline",
        tone: "critical",
        title: d.title,
        detail: d.description,
        meta: d.deadlineText,
        note: d.clashNote,
        tab: "deadlines",
      });
    });

    opportunities.forEach((o) => {
      const date = fromISO(o.deadline);
      if (!date) return;
      events.push({
        id: `o-${o.id}`,
        rawId: o.id,
        date,
        kind: o.category === "Cultural" ? "Event" : "Opportunity",
        tone: o.category === "Cultural" ? "medium" : "ocean",
        title: o.title,
        detail: o.description,
        meta: o.deadlineText,
        note: o.whyHere,
        tab: "opportunities",
      });
    });

    const byDay = events.reduce((acc, e) => {
      const k = keyOf(e.date);
      (acc[k] = acc[k] || []).push(e);
      return acc;
    }, {});

    return {
      events,
      byDay,
      undated: deadlines.filter((d) => d.dueInHours == null),
      // Absorbed from the old Schedule screen: items the pipeline itself
      // flagged as colliding with something else.
      flagged: deadlines.filter((d) => d.clashNote),
    };
  }, [deadlines, opportunities, snapshot.getTime()]);

  const firstEvent = useMemo(
    () => [...events].sort((a, b) => a.date - b.date)[0] ?? null,
    [events]
  );

  const [cursor, setCursor] = useState(
    () => new Date(snapshot.getFullYear(), snapshot.getMonth(), 1)
  );
  const [selected, setSelected] = useState(() => keyOf(snapshot));

  // When the dataset changes — an import, or a reset to the sample — jump to
  // the month that actually has something in it rather than sitting on an
  // empty September.
  useEffect(() => {
    if (!firstEvent) return;
    setCursor(new Date(firstEvent.date.getFullYear(), firstEvent.date.getMonth(), 1));
    setSelected(keyOf(firstEvent.date));
  }, [firstEvent?.id]);

  const cells = useMemo(
    () => monthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );

  const dayEvents = byDay[selected] || [];
  const selectedDate = useMemo(() => {
    const [y, m, d] = selected.split("-").map(Number);
    return new Date(y, m, d);
  }, [selected]);

  const shift = (n) =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  return (
    <section>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Calendar</h1>
        <p className="text-sm text-slate">
          Only dates Synq could confirm from a message. Days with more than one item are
          flagged.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1fr_21rem]">
        <Card className="p-4 lg:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-ink">
              {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => shift(-1)}
                aria-label="Previous month"
                className="rounded-full p-1.5 text-slate hover:bg-slate/10 hover:text-ink"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                onClick={() => shift(1)}
                aria-label="Next month"
                className="rounded-full p-1.5 text-slate hover:bg-slate/10 hover:text-ink"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>

          <div className="mb-1.5 grid grid-cols-7 gap-1.5">
            {DOW.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((date, i) => {
              if (!date) return <div key={`x${i}`} className="min-h-[74px]" />;
              const k = keyOf(date);
              const items = byDay[k] || [];
              const isSelected = k === selected;
              const isSnapshot = k === keyOf(snapshot);

              return (
                <button
                  key={k}
                  onClick={() => setSelected(k)}
                  className={[
                    "min-h-[74px] rounded-lg border p-1.5 text-left transition-colors",
                    isSelected
                      ? "border-ocean bg-ocean/10"
                      : "border-slate/15 hover:border-slate/35",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "text-xs font-semibold",
                      isSnapshot ? "text-sky" : "text-ink/70",
                    ].join(" ")}
                  >
                    {date.getDate()}
                  </span>

                  <div className="mt-1 flex flex-col gap-1">
                    {items.slice(0, 1).map((e) => (
                      <span
                        key={e.id}
                        className={`truncate rounded px-1 py-0.5 text-[9px] font-medium text-ink/90 ${CHIP[e.tone]}`}
                      >
                        {e.title}
                      </span>
                    ))}
                    {items.length > 1 && (
                      <span className="text-[9px] text-slate">+{items.length - 1} more</span>
                    )}
                  </div>

                  {items.length > 1 && (
                    <div className="mt-1 flex gap-0.5">
                      {items.map((e) => (
                        <span
                          key={`dot-${e.id}`}
                          className={`h-1 w-1 rounded-full ${DOT[e.tone]}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="h-fit p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate">
            Selected date
          </p>
          <p className="mt-1 font-display text-lg font-bold text-ink">
            {selectedDate.toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>

          {dayEvents.length > 1 && (
            <p className="mt-3 rounded-lg border border-high/30 bg-high/5 p-2.5 text-xs leading-relaxed text-ink/80">
              {dayEvents.length} things land on this day.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-3">
            {dayEvents.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate">
                Nothing confirmed for this date.
              </p>
            ) : (
              dayEvents.map((e) => (
                <div key={e.id} className="rounded-xl border border-slate/20 p-3">
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <p className="font-display text-sm font-bold text-ink">{e.title}</p>
                    <Badge tone={e.tone}>{e.kind}</Badge>
                  </div>
                  {e.meta && (
                    <p className="mb-1 text-[11px] italic text-slate">"{e.meta}"</p>
                  )}
                  {e.detail && (
                    <p className="text-xs leading-relaxed text-ink/70">{e.detail}</p>
                  )}
                  {e.note && (
                    <p className="mt-2 border-t border-slate/15 pt-2 text-[11px] leading-relaxed text-ink/60">
                      {e.note}
                    </p>
                  )}
                  <button
                    onClick={() => onNavigate?.(e.tab, e.rawId)}
                    className="mt-2.5 w-full rounded-full bg-ocean px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Open in {e.tab === "deadlines" ? "Deadlines" : "Opportunities"}
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {flagged.length > 0 && (
        <Card className="mt-4 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <AlertTriangle size={15} className="text-high" />
            Things that collide — {flagged.length}
          </p>
          <div className="flex flex-col gap-2.5">
            {flagged.map((d) => (
              <div key={d.id} className="rounded-xl border border-high/25 bg-high/5 p-3">
                <p className="font-display text-sm font-bold text-ink">{d.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink/70">{d.clashNote}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {undated.length > 0 && (
        <Card className="mt-4 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <HelpCircle size={15} className="text-slate" />
            Not on the calendar — {undated.length} items
          </p>
          <div className="flex flex-wrap gap-2">
            {undated.map((d) => (
              <span
                key={d.id}
                className="rounded-full border border-slate/25 px-3 py-1.5 text-xs text-slate"
              >
                {d.title}
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-slate">
            No date was ever stated for these, so they get no square. Synq will not put an
            invented date in your calendar.
          </p>
        </Card>
      )}
    </section>
  );
}

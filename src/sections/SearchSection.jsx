import React, { useState, useMemo } from "react";
import { Search as SearchIcon, TriangleAlert, Layers } from "lucide-react";
import clsx from "clsx";
import { useData } from "../data/DataContext";

const listOf = (value) => (value ? String(value).split(",").map((s) => s.trim()) : []);
// Options are derived from whatever corpus is loaded, so an imported chat
// repopulates the filters instead of offering the sample data's departments.
const optionsFor = (rows, key) =>
  ["All", ...[...new Set(rows.flatMap((a) => listOf(a[key])))].filter(Boolean).sort()];

// Strict on purpose: picking "CS-AI" now shows only items that actually say
// CS-AI, instead of also pulling in every "All Departments" item — the old
// behavior technically worked but made filtering look like it did nothing,
// since ~90% of the data is tagged universal.
const matches = (value, picked) => picked === "All" || listOf(value).includes(picked);

const LANES = [
  { key: "missed", label: "Missed", tone: "critical" },
  { key: "now", label: "Happening now", tone: "ocean" },
  { key: "discover", label: "Worth discovering", tone: "medium" },
];

export function SearchSection() {
  const { announcements = [] } = useData();

  const DEPARTMENTS = useMemo(() => optionsFor(announcements, "department"), [announcements]);
  const YEARS = useMemo(() => optionsFor(announcements, "year"), [announcements]);
  const TYPES = useMemo(() => optionsFor(announcements, "type"), [announcements]);

  const [lane, setLane] = useState("now");
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("All");
  const [year, setYear] = useState("All");
  const [type, setType] = useState("All");

  const counts = useMemo(() => {
    const c = { missed: 0, now: 0, discover: 0 };
    announcements.forEach((a) => {
      if (c[a.lane] !== undefined) c[a.lane] += 1;
    });
    return c;
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return announcements.filter((a) => {
      if (a.lane !== lane) return false;
      if (!matches(a.department, dept)) return false;
      if (!matches(a.year, year)) return false;
      if (!matches(a.type, type)) return false;
      if (q && !a.title.toLowerCase().includes(q) && !(a.summary || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lane, query, dept, year, type]);

  return (
    <section>
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink">Branch-Specific Announcements</h1>
        <p className="text-sm text-slate">Grouped by whether you can still act on them.</p>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {LANES.map((l) => {
          const active = lane === l.key;
          return (
            <button
              key={l.key}
              onClick={() => setLane(l.key)}
              className={clsx(
                "flex flex-col items-center gap-0.5 rounded-xl border py-2.5 transition-colors",
                active ? "border-ocean/50 bg-ocean/10" : "border-white/10 bg-surface"
              )}
            >
              <span
                className={clsx(
                  "font-display text-lg font-extrabold",
                  l.key === "missed" ? "text-critical" : active ? "text-ocean-light" : "text-ink"
                )}
              >
                {counts[l.key]}
              </span>
              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate">{l.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-5 flex items-center gap-2 rounded-full border border-white/10 bg-surface px-4 py-2.5">
        <SearchIcon size={15} className="text-slate" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search announcements…"
          className="w-full bg-transparent text-sm text-ink placeholder:text-slate/60 focus:outline-none"
        />
      </div>

      <ChipRow label="Department" value={dept} onChange={setDept} options={DEPARTMENTS} />
      <ChipRow label="Year" value={year} onChange={setYear} options={YEARS} />
      <ChipRow label="Type" value={type} onChange={setType} options={TYPES} />

      <p className="mb-4 mt-1 text-xs text-slate">
        Showing {results.length} of {counts[lane]} in this lane.
      </p>

      <div className="flex flex-col gap-3">
        {results.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate">Nothing here matches these filters.</p>
        ) : (
          results.map((a) => (
            <div
              key={a.id}
              className={clsx(
                "rounded-xl2 border bg-surface p-4",
                a.confidence === "missing" ? "border-dashed border-white/15" : "border-white/10"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[15px] font-bold text-ink">{a.title}</p>
                  <p className="mt-1 text-sm text-ink/70">{a.summary}</p>
                </div>
                <span className="shrink-0 text-xs text-slate">
                  {new Date(a.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>

              {a.issue && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-critical/28 bg-critical/10 p-2.5">
                  <TriangleAlert size={14} className="mt-0.5 shrink-0 text-critical" />
                  <p className="text-xs leading-relaxed text-ink/85">{a.issue}</p>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate/15 px-2.5 py-0.5 text-[10.5px] font-bold text-slate">{a.department}</span>
                <span className="rounded-full bg-slate/15 px-2.5 py-0.5 text-[10.5px] font-bold text-slate">{a.year}</span>
                <span className="rounded-full bg-medium/15 px-2.5 py-0.5 text-[10.5px] font-bold text-medium">{a.type}</span>
                {a.sourceCount > 1 && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] text-slate">
                    <Layers size={11} /> {a.sourceCount} sources
                  </span>
                )}
                {a.confidence !== "stated" && (
                  <span className="rounded-full border border-dashed border-slate/40 px-2.5 py-0.5 text-[10.5px] font-bold text-slate">
                    Not confirmed
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ChipRow({ label, value, onChange, options }) {
  return (
    <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10.5px] font-bold uppercase tracking-wide text-slate">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={clsx(
            "rounded-full border px-3 py-1 text-[11.5px] font-semibold transition-colors",
            value === o ? "border-ocean bg-ocean text-canvas" : "border-white/10 bg-surface text-slate hover:border-ocean/40"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

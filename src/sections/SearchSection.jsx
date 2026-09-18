import React, { useMemo, useState } from "react";
import { Search as SearchIcon, AlertTriangle, Layers } from "lucide-react";
import { Card, Badge } from "../components/ui";
import { useData } from "../data/DataContext";

const ANY_DEPT = "All Departments";
const ANY_YEAR = "All Years";

// "CSE-AI, ECE-AI" is two departments in one field.
const listOf = (value) => (value ? String(value).split(",").map((s) => s.trim()) : []);



// An item tagged "All Departments" / "All Years" matches every choice.
const matches = (value, picked, universal) =>
  picked === "All" ||
  listOf(value).includes(picked) ||
  (universal ? listOf(value).includes(universal) : false);

export function SearchSection() {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("All");
  const [year, setYear] = useState("All");
  const [type, setType] = useState("All");
    const { announcements } = useData();

  // Options are derived from the data, so every option returns results.
  const { DEPARTMENTS, YEARS, TYPES } = useMemo(() => {
    const optionsFor = (key, universal) => [
      "All",
      ...[...new Set(announcements.flatMap((a) => listOf(a[key])))]
        .filter((v) => v && v !== universal)
        .sort(),
    ];
    return {
      DEPARTMENTS: optionsFor("department", ANY_DEPT),
      YEARS: optionsFor("year", ANY_YEAR),
      TYPES: optionsFor("type", null),
    };
  }, [announcements]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return announcements.filter((a) => {
      if (!matches(a.department, dept, ANY_DEPT)) return false;
      if (!matches(a.year, year, ANY_YEAR)) return false;
      if (!matches(a.type, type, null)) return false;
      if (
        q &&
        !a.title.toLowerCase().includes(q) &&
        !(a.summary || "").toLowerCase().includes(q) &&
        !(a.channel || "").toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
   }, [announcements, query, dept, year, type]);
  return (
    <section>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">
          Branch-Specific Announcements
        </h1>
        <p className="text-sm text-slate">
          Every filter below is built from what was actually found in the chats.
        </p>
      </header>

      <Card className="mb-6 p-4">
        <div className="mb-4 flex items-center gap-2 rounded-full border border-slate/20 bg-surface px-4 py-2.5">
          <SearchIcon size={16} className="text-slate" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search announcements…"
            className="w-full bg-transparent text-sm text-ink placeholder:text-slate/60 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <Select label="Department" value={dept} onChange={setDept} options={DEPARTMENTS} />
          <Select label="Year" value={year} onChange={setYear} options={YEARS} />
          <Select label="Notice type" value={type} onChange={setType} options={TYPES} />
        </div>
        <p className="mt-3 text-xs text-slate">
          Showing {results.length} of {announcements.length} items kept from 50 messages.
        </p>
      </Card>

      <div className="flex flex-col gap-3">
        {results.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate">
            No announcements match these filters.
          </p>
        ) : (
          results.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[15px] font-bold text-ink">{a.title}</p>
                  <p className="mt-1 text-sm text-ink/70">{a.summary}</p>
                </div>
                <span className="shrink-0 text-xs text-slate">
                  {new Date(a.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              {a.issue && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-high/25 bg-high/5 p-2.5">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-high" />
                  <p className="text-xs leading-relaxed text-ink/75">{a.issue}</p>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="ocean">{a.department}</Badge>
                <Badge tone="slate">{a.year}</Badge>
                <Badge tone="medium">{a.type}</Badge>
                {a.sourceCount > 1 && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate">
                    <Layers size={12} />
                    {a.sourceCount} sources
                  </span>
                )}
                {a.confidence !== "stated" && <Badge tone="slate">Not confirmed</Badge>}
                {a.channel && <span className="text-xs text-slate">· {a.channel}</span>}
              </div>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate/20 bg-surface px-3 py-1.5 text-sm text-ink focus:border-ocean focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

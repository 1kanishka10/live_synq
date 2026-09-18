import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import deadlines from "../data/deadlines.json";
import opportunities from "../data/opportunities.json";
import announcements from "../data/announcements.json";
import societies from "../data/societies.json";
import missed from "../data/missed.json";

const clean = (...parts) => parts.filter(Boolean).join(" ").toLowerCase();

const RAW = [
  ...deadlines.map((d) => ({
    key: `d-${d.id}`,
    tab: "deadlines",
    kind: "Deadline",
    title: d.title,
    sub: d.tag,
    hay: clean(d.title, d.description, d.tag, d.deadlineText, d.consequence),
  })),
  ...opportunities.map((o) => ({
    key: `o-${o.id}`,
    tab: "opportunities",
    kind: "Opportunity",
    title: o.title,
    sub: o.category,
    hay: clean(o.title, o.description, o.category, o.whyHere, o.eligibility),
  })),
  ...announcements.map((a) => ({
    key: `a-${a.id}`,
    tab: "search",
    kind: "Announcement",
    title: a.title,
    sub: a.channel,
    hay: clean(a.title, a.summary, a.channel, a.department, a.type, a.issue),
  })),
  ...societies.map((s) => ({
    key: `s-${s.id}`,
    tab: "societies",
    kind: "Society",
    title: s.name,
    sub: s.category,
    hay: clean(s.name, s.description, s.category, (s.channels || []).join(" ")),
  })),
  ...missed.map((m) => ({
    key: `m-${m.id}`,
    tab: "dashboard",
    kind: "Missed",
    title: m.title,
    sub: m.tag,
    hay: clean(m.title, m.description, m.tag, m.issue),
  })),
];

// The same item can appear in more than one lane. Search shows it once.
const seen = new Set();
const INDEX = RAW.filter((r) => {
  const k = r.title.toLowerCase();
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

const TONE = {
  Deadline: "text-critical",
  Opportunity: "text-sky",
  Announcement: "text-ocean",
  Society: "text-medium",
  Missed: "text-high",
};

export function GlobalSearch({ onNavigate }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return INDEX.filter((r) => r.hay.includes(q)).slice(0, 7);
  }, [query]);

  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function go(r) {
    onNavigate?.(r.tab);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    <div ref={boxRef} className="relative mx-3 hidden max-w-md flex-1 sm:block">
      <div className="flex items-center gap-2 rounded-full border border-slate/25 bg-surface px-3.5 py-2">
        <SearchIcon size={15} className="shrink-0 text-slate" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search notices, deadlines, societies…"
          className="w-full bg-transparent text-sm text-ink placeholder:text-slate/60 focus:outline-none"
        />
        {query ? (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear"
            className="shrink-0 text-slate hover:text-ink"
          >
            <X size={14} />
          </button>
        ) : (
          <kbd className="hidden shrink-0 rounded border border-slate/30 px-1.5 py-0.5 text-[10px] text-slate lg:block">
            ⌘K
          </kbd>
        )}
      </div>

      {open && query.trim() && (
        <div className="glass-dark absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl2 border border-white/60 shadow-panel">
          {results.length === 0 ? (
            <p className="px-4 py-5 text-center text-xs text-slate">
              Nothing matches "{query.trim()}".
            </p>
          ) : (
            <>
              {results.map((r) => (
                <button
                  key={r.key}
                  onClick={() => go(r)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-white/5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {r.title}
                    </span>
                    {r.sub && (
                      <span className="block truncate text-[11px] text-slate">{r.sub}</span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider ${TONE[r.kind]}`}
                  >
                    {r.kind}
                  </span>
                </button>
              ))}
              <p className="border-t border-white/10 px-4 py-2 text-[10px] text-slate">
                Searching {INDEX.length} items extracted from 50 messages
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

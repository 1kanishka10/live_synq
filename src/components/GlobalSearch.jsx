import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { useData } from "../data/DataContext";

const clean = (...parts) => parts.filter(Boolean).join(" ").toLowerCase();

// Built from whatever corpus is loaded rather than at module scope, so an
// imported chat becomes searchable immediately.
function buildIndex({ deadlines = [], opportunities = [], announcements = [], societies = [], missed = [] }) {
  const raw = [
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
  return raw.filter((r) => {
    const k = (r.title || "").toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const TONE = {
  Deadline: "text-critical",
  Opportunity: "text-sky",
  Announcement: "text-ocean",
  Society: "text-medium",
  Missed: "text-high",
};

export function GlobalSearch({ onNavigate }) {
  const data = useData();
  const INDEX = useMemo(() => buildIndex(data), [data]);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false); // desktop inline dropdown
  const [mobileOpen, setMobileOpen] = useState(false); // phone top-drop panel
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const mobileRef = useRef(null);
  const mobileInputRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return INDEX.filter((r) => r.hay.includes(q)).slice(0, 7);
  }, [query]);

  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
      if (mobileRef.current && !mobileRef.current.contains(e.target)) setMobileOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMobileOpen(false);
        inputRef.current?.blur();
        mobileInputRef.current?.blur();
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

  // Focus the phone panel's input as soon as it opens.
  useEffect(() => {
    if (mobileOpen) mobileInputRef.current?.focus();
  }, [mobileOpen]);

  function go(r) {
    onNavigate?.(r.tab);
    setQuery("");
    setOpen(false);
    setMobileOpen(false);
    inputRef.current?.blur();
  }

  // Shared results list, reused by both the desktop dropdown and the phone panel.
  function ResultsList() {
    return (
      <div className="glass-dark overflow-hidden rounded-xl2 border border-white/60 shadow-panel">
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
    );
  }

  return (
    <>
      {/* Tablet / desktop inline search — unchanged: hidden below 640px, shown at sm and up */}
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
          <div className="absolute left-0 right-0 top-full z-50 mt-2">
            <ResultsList />
          </div>
        )}
      </div>

      {/* Phone-only search trigger — mirror of the rule above: shown below 640px, hidden at sm and up */}
      <div ref={mobileRef} className="mx-2 flex sm:hidden">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Search"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate/25 bg-surface text-slate hover:text-ink"
        >
          <SearchIcon size={16} />
        </button>

        {mobileOpen && (
          <div className="fixed inset-x-0 top-16 z-50 px-3">
            <div className="flex items-center gap-2 rounded-full border border-slate/25 bg-surface px-3.5 py-2 shadow-panel">
              <SearchIcon size={15} className="shrink-0 text-slate" />
              <input
                ref={mobileInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notices, deadlines, societies…"
                className="w-full bg-transparent text-sm text-ink placeholder:text-slate/60 focus:outline-none"
              />
              <button
                onClick={() => {
                  if (query) {
                    setQuery("");
                    mobileInputRef.current?.focus();
                  } else {
                    setMobileOpen(false);
                  }
                }}
                aria-label={query ? "Clear" : "Close search"}
                className="shrink-0 text-slate hover:text-ink"
              >
                <X size={14} />
              </button>
            </div>

            {query.trim() && <div className="mt-2">
              <ResultsList />
            </div>}
          </div>
        )}
      </div>
    </>
  );
}

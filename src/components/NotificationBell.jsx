import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Clock3,
  AlertTriangle,
  RefreshCw,
  Archive,
  ShieldQuestion,
} from "lucide-react";
import { useData } from "../data/DataContext";

const SEEN_KEY = "synq.notifications.seen";

function when(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Built from whatever corpus is loaded rather than at module scope. Previously
// this list was assembled once when the page's JavaScript first ran, so the
// bell kept showing the sample data's notifications even after a real chat had
// been imported.
function buildEvents({ deadlines = [], missed = [], verify = [] }) {
  const events = [];

  // Anything Synq could not corroborate comes first — it is the only kind of
  // notification where acting before reading can cost you money.
  verify.forEach((v) =>
    events.push({
      key: `verify-${v.id}`,
      kind: "Check before acting",
      icon: ShieldQuestion,
      tone: "text-high",
      title: v.title,
      body:
        v.trust?.reasons?.[0]?.headline ??
        "Synq could not corroborate this against anything else in your groups.",
      at: null,
      tab: "verify",
    })
  );

  // Closing within a day.
  deadlines
    .filter((d) => d.dueInHours != null && d.dueInHours < 24)
    .forEach((d) =>
      events.push({
        key: `soon-${d.id}`,
        kind: "Closing soon",
        icon: Clock3,
        tone: "text-critical",
        title: d.title,
        body: `Closes in ${d.dueInHours} hours. ${d.consequence || ""}`.trim(),
        at: null,
        tab: "deadlines",
      })
    );

  // Anything the model flagged as a possible overlap. These live on the
  // Calendar now — the old Schedule screen was folded into it.
  deadlines
    .filter((d) => d.clashNote)
    .forEach((d) =>
      events.push({
        key: `clash-${d.id}`,
        kind: "Possible clash",
        icon: AlertTriangle,
        tone: "text-high",
        title: d.title,
        body: d.clashNote,
        at: null,
        tab: "calendar",
      })
    );

  // Items that were superseded by a later message.
  deadlines.forEach((d) =>
    (d.history || []).forEach((h, i) =>
      events.push({
        key: `hist-${d.id}-${i}`,
        kind: "Details changed",
        icon: RefreshCw,
        tone: "text-ocean",
        title: d.title,
        body: h.what,
        at: h.at,
        tab: "deadlines",
      })
    )
  );

  // Things that closed before anyone saw them.
  missed.slice(0, 3).forEach((m) =>
    events.push({
      key: `missed-${m.id}`,
      kind: "Already closed",
      icon: Archive,
      tone: "text-slate",
      title: m.title,
      body: m.issue || m.description,
      at: null,
      tab: "dashboard",
    })
  );

  return events;
}

export function NotificationBell({ onNavigate }) {
  const data = useData();
  const events = useMemo(() => buildEvents(data), [data]);

  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(true);
  const boxRef = useRef(null);

  // Re-runs when the corpus changes, so importing a chat brings the dot back
  // rather than leaving it marked as read against the old list.
  useEffect(() => {
    try {
      setSeen(window.localStorage.getItem(SEEN_KEY) === String(events.length));
    } catch {
      setSeen(false);
    }
  }, [events.length]);

  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function openPanel() {
    setOpen((v) => !v);
    setSeen(true);
    try {
      window.localStorage.setItem(SEEN_KEY, String(events.length));
    } catch {
      // Storage blocked — the dot just comes back next visit.
    }
  }

  function go(e) {
    onNavigate?.(e.tab);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={openPanel}
        className="relative rounded-full p-2 text-slate transition-colors hover:bg-slate/10 hover:text-ink"
        aria-label={`Notifications, ${events.length} items`}
      >
        <Bell size={18} />
        {!seen && events.length > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-critical" />
        )}
      </button>

      {open && (
        <div className="glass-dark absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl2 border border-white/60 shadow-panel">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="font-display text-sm font-bold text-ink">What changed</p>
            <p className="text-[11px] text-slate">
              Updates Synq found by comparing messages over time
            </p>
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {events.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate">Nothing new.</p>
            ) : (
              events.map((e) => {
                const Icon = e.icon;
                return (
                  <button
                    key={e.key}
                    onClick={() => go(e)}
                    className="flex w-full gap-2.5 border-b border-white/5 px-4 py-3 text-left last:border-0 hover:bg-white/5"
                  >
                    <Icon size={14} className={`mt-0.5 shrink-0 ${e.tone}`} />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-baseline gap-x-2">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider ${e.tone}`}
                        >
                          {e.kind}
                        </span>
                        {when(e.at) && (
                          <span className="text-[10px] text-slate">{when(e.at)}</span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-medium text-ink">
                        {e.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink/70">{e.body}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

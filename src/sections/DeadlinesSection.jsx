import React, { useState, useEffect, useMemo } from "react";
import { Link as LinkIcon, MessageSquare, AlertTriangle, GitMerge } from "lucide-react";
import { Drawer } from "../components/ui";
import { useData } from "../data/DataContext";
import { authorityOf } from "../../lib/authority";

// ---- urgency ---------------------------------------------------
// Only 3 real tones exist in the theme: critical / high / medium.
// "Not confirmed" borrows the medium color but gets its own visual
// treatment (dashed ring, no ticking timer) further down.
function urgencyOf(hours) {
  if (hours == null) return { tone: "medium", label: "Not confirmed", confirmed: false };
  if (hours < 24) return { tone: "critical", label: "Critical", confirmed: true };
  if (hours < 72) return { tone: "high", label: "High", confirmed: true };
  return { tone: "medium", label: "Medium", confirmed: true };
}

const TONE = {
  critical: { fill: "rgb(var(--c-critical))", text: "text-critical", badgeBg: "bg-critical/15", badgeText: "text-critical" },
  high: { fill: "rgb(var(--c-high))", text: "text-high", badgeBg: "bg-high/15", badgeText: "text-high" },
  medium: { fill: "rgb(var(--c-medium))", text: "text-medium", badgeBg: "bg-medium/15", badgeText: "text-medium" },
};

function href(link) {
  if (!link) return null;
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

// ---- live countdown ---------------------------------------------
function useCountdown(hours) {
  const target = useMemo(
    () => (hours == null ? null : Date.now() + hours * 3600000),
    [hours]
  );
  const [left, setLeft] = useState(() => (target ? target - Date.now() : null));

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setLeft(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (left == null) return null;
  const c = Math.max(0, left);
  return {
    d: Math.floor(c / 86400000),
    h: Math.floor((c % 86400000) / 3600000),
    m: Math.floor((c % 3600000) / 60000),
    s: Math.floor((c % 60000) / 1000),
  };
}

// ---- one circular node --------------------------------------------
const SIZE = 150;
const STROKE = 6;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
// No startDate exists in the data, so the ring's fill is an approximation:
// remaining time against a flat 7-day reference window, not a true
// "time elapsed since this was posted" measurement.
const REF_WINDOW_HOURS = 168;

function DeadlineNode({ d, onOpen, delay }) {
  const u = urgencyOf(d.dueInHours);
  const tone = TONE[u.tone];
  const cd = useCountdown(d.dueInHours);
  const pct = u.confirmed
    ? Math.min(100, Math.max(4, (d.dueInHours / REF_WINDOW_HOURS) * 100))
    : 0;
  const offset = CIRC - (pct / 100) * CIRC;

  return (
    <button
      onClick={() => onOpen(d)}
      className="group flex flex-col items-center gap-3 text-left focus:outline-none"
      style={{ animation: `synq-node-in 0.5s cubic-bezier(.22,1,.36,1) both`, animationDelay: `${delay}ms` }}
    >
      <div
        className="relative flex items-center justify-center rounded-full transition-transform duration-200 group-hover:-translate-y-1 group-focus-visible:-translate-y-1"
        style={{ width: SIZE, height: SIZE }}
      >
        <svg width={SIZE} height={SIZE} className="absolute inset-0 -rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={tone.fill}
            strokeOpacity={0.16}
            strokeWidth={STROKE}
            strokeDasharray={u.confirmed ? undefined : "3 6"}
          />
          {u.confirmed && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={tone.fill}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              className={u.tone === "critical" ? "animate-pulse-ring" : undefined}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          )}
        </svg>

        <div className="flex flex-col items-center gap-1 px-4 text-center">
          <span className={`font-display text-[11px] font-bold ${tone.text}`}>#{d.rank}</span>
          <span className="font-display text-[13px] font-bold leading-tight text-ink line-clamp-3">
            {d.title}
          </span>
          {u.confirmed ? (
            <span className="mt-1 font-mono text-[13px] font-semibold text-ink">
              {cd.d > 0 ? `${cd.d}d ${String(cd.h).padStart(2, "0")}h` : `${String(cd.h).padStart(2, "0")}:${String(cd.m).padStart(2, "0")}:${String(cd.s).padStart(2, "0")}`}
            </span>
          ) : (
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate">
              No date given
            </span>
          )}
        </div>
      </div>

      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone.badgeBg} ${tone.badgeText}`}>
        {u.label}
      </span>
      <span className="max-w-[140px] truncate text-[11px] text-slate">{d.tag}</span>
    </button>
  );
}

// ---- drawer content -------------------------------------------------
function DrawerBody({ d }) {
  const u = urgencyOf(d.dueInHours);
  const tone = TONE[u.tone];
  const link = href(d.actionLink);

  // Merge sources + history into one time-ordered trail.
  const trail = useMemo(() => {
    const fromSources = (d.sources ?? []).map((s) => ({
      at: s.sentAt,
      what: s.excerpt,
      who: `${s.sender} · ${s.channel}`,
    }));
    const fromHistory = (d.history ?? []).map((h) => ({ at: h.at, what: h.what, who: null }));
    return [...fromSources, ...fromHistory].sort((a, b) => new Date(a.at) - new Date(b.at));
  }, [d]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone.badgeBg} ${tone.badgeText}`}>
          {u.label}
        </span>
        <span className="text-xs font-semibold text-slate">{d.tag}</span>
        {authorityOf(d).label && (
          <span className="rounded-full bg-medium/15 px-2.5 py-1 text-xs font-bold text-medium">
            {authorityOf(d).label}
          </span>
        )}
        {d.sourceCount > 1 && (
          <span className="rounded-full bg-slate/15 px-2.5 py-1 text-xs font-bold text-slate">
            {d.sourceCount} sources
          </span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-ink/85">{d.description}</p>

      {/* deadline, as an actual message bubble */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate">Deadline, as written</p>
        {d.sources?.[0] && (
          <p className="mb-1 text-[11px] text-slate">
            {d.sources[0].sender} · {d.sources[0].channel}
          </p>
        )}
        <div className="rounded-tr-2xl rounded-b-2xl rounded-tl border border-medium/25 bg-medium/10 px-3.5 py-2.5 text-sm italic leading-relaxed text-ink">
          {d.deadlineText ? `“${d.deadlineText}”` : "No date was ever stated for this."}
        </div>
      </div>

      {/* uncertainty / issue as flagged callouts */}
      {(d.uncertainty || d.issue) && (
        <div className="flex flex-col gap-2">
          {d.uncertainty && (
            <div className="flex gap-2.5 rounded-xl border border-high/30 bg-high/10 px-3.5 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-high" />
              <p className="text-xs leading-relaxed text-ink/90">{d.uncertainty}</p>
            </div>
          )}
          {d.issue && (
            <div className="flex gap-2.5 rounded-xl border border-critical/30 bg-critical/10 px-3.5 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-critical" />
              <p className="text-xs leading-relaxed text-ink/90">{d.issue}</p>
            </div>
          )}
        </div>
      )}

      {/* clash note as its own card */}
      {d.clashNote && (
        <div className="rounded-xl border border-ocean/30 bg-ocean/10 px-3.5 py-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ocean-light">
            <GitMerge size={13} /> Possible clash
          </p>
          <p className="text-xs leading-relaxed text-ink/90">{d.clashNote}</p>
        </div>
      )}

      {/* what to do */}
      {(d.submission || d.consequence || d.location || d.contact) && (
        <div className="flex flex-col gap-2 border-t border-slate/10 pt-4 text-xs">
          {d.submission && (
            <p><span className="font-semibold text-slate">What to do — </span><span className="text-ink/85">{d.submission}</span></p>
          )}
          {d.location && (
            <p><span className="font-semibold text-slate">Where — </span><span className="text-ink/85">{d.location}</span></p>
          )}
          {d.consequence && (
            <p><span className="font-semibold text-slate">If missed — </span><span className="text-ink/85">{d.consequence}</span></p>
          )}
          {d.contact && (
            <p><span className="font-semibold text-slate">Contact — </span><span className="text-ink/85">{d.contact}</span></p>
          )}
        </div>
      )}

      {/* how this changed — merged sources + history timeline */}
      {trail.length > 0 && (
        <div className="border-t border-slate/10 pt-4">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate">
            <MessageSquare size={13} /> How this changed · {trail.length} message{trail.length > 1 ? "s" : ""}
          </p>
          <div className="flex flex-col">
            {trail.map((t, i) => (
              <div key={i} className="relative pb-4 pl-5 last:pb-0">
                <span className="absolute left-[3px] top-1.5 h-2 w-2 rounded-full bg-ocean-light" />
                {i < trail.length - 1 && (
                  <span className="absolute left-[7px] top-3.5 bottom-0 w-px bg-slate/15" />
                )}
                <p className="text-[10.5px] text-slate">
                  {new Date(t.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {t.who && <> · {t.who}</>}
                </p>
                <p className="text-xs leading-relaxed text-ink/90">{t.what}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-ocean px-4 py-3 text-sm font-bold text-canvas shadow-glow"
        >
          <LinkIcon size={15} /> Open link
        </a>
      )}
    </div>
  );
}

// ---- section --------------------------------------------------------
export function DeadlinesSection() {
  const { deadlines = [] } = useData();
  const [selected, setSelected] = useState(null);
  const sorted = [...deadlines].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)).slice(0, 5);
  const u = selected ? urgencyOf(selected.dueInHours) : null;

  return (
    <section>
      <style>{`
        @keyframes synq-node-in {
          from { opacity: 0; transform: translateY(14px) scale(0.96); }
          to { opacity: 1; transform: none; }
        }
        @keyframes synq-pulse-ring {
          0%, 100% { filter: drop-shadow(0 0 0 rgba(0,0,0,0)); }
          50% { filter: drop-shadow(0 0 6px rgb(var(--c-critical) / 0.55)); }
        }
        .animate-pulse-ring { animation: synq-pulse-ring 1.8s ease-in-out infinite; }
      `}</style>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Urgent Deadlines</h1>
        <p className="text-sm text-slate">
          Top 5, ranked by what it costs you to miss them. Click one to see where it came from.
        </p>
      </header>

      <div className="relative flex flex-col items-center gap-10 overflow-x-auto py-4 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
        <div className="pointer-events-none absolute left-0 right-0 top-[75px] hidden h-px bg-slate/10 lg:block" />
        {sorted.map((d, i) => (
          <DeadlineNode key={d.id} d={d} onOpen={setSelected} delay={i * 90} />
        ))}
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        accent={u ? TONE[u.tone].fill : undefined}
      >
        {selected && <DrawerBody d={selected} />}
      </Drawer>
    </section>
  );
}

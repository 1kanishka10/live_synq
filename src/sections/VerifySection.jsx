import React, { useMemo, useState } from "react";
import {
  ShieldQuestion,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  ListChecks,
  Link as LinkIcon,
  Radio,
} from "lucide-react";
import { Drawer } from "../components/ui";
import { useData } from "../data/DataContext";

// Written out in full: Tailwind only keeps classes it can find as literal text.
const TONE = {
  critical: { fill: "rgb(var(--c-critical))", text: "text-critical", badgeBg: "bg-critical/15", badgeText: "text-critical" },
  high: { fill: "rgb(var(--c-high))", text: "text-high", badgeBg: "bg-high/15", badgeText: "text-high" },
  medium: { fill: "rgb(var(--c-medium))", text: "text-medium", badgeBg: "bg-medium/15", badgeText: "text-medium" },
};

function when(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---- corroboration dial ----------------------------------------------
// Three things a genuine campus notice normally has, drawn as three arcs.
// A filled arc is a check that passed. The empty ones ARE the finding —
// this is the gap between what the message claims and what anyone confirmed.
const SIZE = 96;
const STROKE = 6;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
const GAP = 10;
const SEG = CIRC / 3 - GAP;

function checksOf(c = {}) {
  return [
    { key: "repeated", label: "Said more than once", passed: (c.timesSeen ?? 1) > 1 },
    { key: "channels", label: "Seen in more than one group", passed: (c.channels ?? 1) > 1 },
    { key: "authority", label: "Sender Synq recognises", passed: (c.highestAuthority ?? 0) > 0 },
  ];
}

function CorroborationDial({ corroboration }) {
  const checks = checksOf(corroboration);
  const passed = checks.filter((c) => c.passed).length;
  const tone = passed === 0 ? TONE.critical : passed < 3 ? TONE.high : TONE.medium;

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: SIZE, height: SIZE }}
    >
      <svg width={SIZE} height={SIZE} className="absolute inset-0 -rotate-90">
        {checks.map((c, i) => (
          <circle
            key={c.key}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            // A passed check is a solid green arc. A failed one is the same arc
            // in the item's tone at low opacity — the gap is the point, so it
            // still has to be visible rather than absent.
            stroke={c.passed ? TONE.medium.fill : tone.fill}
            strokeOpacity={c.passed ? 1 : 0.22}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${SEG} ${CIRC - SEG}`}
            strokeDashoffset={-(i * (CIRC / 3))}
          />
        ))}
      </svg>
      <div className="flex flex-col items-center leading-none">
        <span className={`font-display text-xl font-black ${tone.text}`}>{passed}</span>
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-slate">of 3</span>
      </div>
    </div>
  );
}

// ---- one flagged item -------------------------------------------------
function VerifyCard({ v, onOpen, delay }) {
  const t = v.trust ?? {};
  const checks = checksOf(t.corroboration);

  return (
    <button
      onClick={() => onOpen(v)}
      className="group w-full rounded-xl2 border p-5 text-left transition-transform duration-200 hover:-translate-y-1 focus:outline-none focus-visible:-translate-y-1"
      style={{
        animation: "synq-node-in 0.5s cubic-bezier(.22,1,.36,1) both",
        animationDelay: `${delay}ms`,
        borderColor: "var(--hair)",
        background: "rgb(var(--c-surface))",
      }}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <CorroborationDial corroboration={t.corroboration} />
          <span className="rounded-full bg-high/15 px-2.5 py-1 text-[11px] font-bold text-high">
            Verify first
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate">{v.tag}</span>
            {t.claimedSource && (
              <span className="rounded-full bg-slate/15 px-2.5 py-1 text-[11px] font-bold text-slate">
                claims: {t.claimedSource}
              </span>
            )}
          </div>

          <h3 className="font-display text-[17px] font-bold leading-snug text-ink">{v.title}</h3>
          {v.description && (
            <p className="mt-1 text-sm leading-relaxed text-ink/70">{v.description}</p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {(t.reasons ?? []).map((r) => (
              <div
                key={r.code}
                className="flex gap-2.5 rounded-xl border border-critical/30 bg-critical/10 px-3.5 py-2.5"
              >
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-critical" />
                <p className="text-xs leading-relaxed text-ink/90">{r.headline}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate/10 pt-3">
            {checks.map((c) => (
              <span
                key={c.key}
                className={`flex items-center gap-1.5 text-[11px] ${
                  c.passed ? "text-medium" : "text-slate"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${c.passed ? "bg-medium" : "bg-slate/40"}`}
                />
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

// ---- drawer content ---------------------------------------------------
function VerifyBody({ v }) {
  const t = v.trust ?? {};
  const c = t.corroboration ?? {};

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-high/30 bg-high/10 px-3.5 py-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-high">
          <ShieldQuestion size={13} /> Not a verdict
        </p>
        <p className="text-xs leading-relaxed text-ink/90">{t.summary}</p>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate">
          What does not check out
        </p>
        <div className="flex flex-col gap-2">
          {(t.reasons ?? []).map((r) => (
            <div
              key={r.code}
              className="rounded-xl border border-critical/30 bg-critical/10 px-3.5 py-3"
            >
              <p className="mb-1 flex items-start gap-2 text-xs font-bold text-ink">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-critical" />
                {r.headline}
              </p>
              <p className="pl-[22px] text-xs leading-relaxed text-ink/75">{r.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {(t.notes ?? []).length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate">
            Context — real, but not damning on its own
          </p>
          <div className="flex flex-col gap-2">
            {t.notes.map((n) => (
              <div
                key={n.code}
                className="rounded-xl border px-3.5 py-3"
                style={{ borderColor: "var(--hair-lit)" }}
              >
                <p className="text-xs font-semibold text-ink/90">{n.headline}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink/60">{n.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(t.checks ?? []).length > 0 && (
        <div className="border-t border-slate/10 pt-4">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ocean-light">
            <ListChecks size={13} /> How to settle it in five minutes
          </p>
          <div className="flex flex-col">
            {t.checks.map((step, i) => (
              <div key={i} className="relative pb-4 pl-6 last:pb-0">
                <span className="absolute left-0 top-0 flex h-[17px] w-[17px] items-center justify-center rounded-full bg-ocean text-[9px] font-bold text-white">
                  {i + 1}
                </span>
                {i < t.checks.length - 1 && (
                  <span className="absolute left-[8px] top-[19px] bottom-0 w-px bg-slate/15" />
                )}
                <p className="text-xs leading-relaxed text-ink/90">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(t.links ?? []).length > 0 && (
        <div className="border-t border-slate/10 pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate">
            <LinkIcon size={13} /> Where it points
          </p>
          <div className="flex flex-wrap gap-2">
            {t.links.map((h) => (
              <span
                key={h}
                className="rounded-lg border border-critical/25 bg-critical/5 px-2.5 py-1.5 font-mono text-[11px] text-ink/80"
              >
                {h}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate">
            Shown as plain text on purpose. Synq will not make a link it has just warned you
            about easier to click.
          </p>
        </div>
      )}

      <div className="border-t border-slate/10 pt-4">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate">
          <Radio size={13} /> What Synq could confirm
        </p>
        <div className="flex flex-col gap-1.5 text-xs">
          {checksOf(c).map((k) => (
            <p key={k.key} className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  k.passed ? "bg-medium" : "bg-critical/60"
                }`}
              />
              <span className={k.passed ? "text-ink/85" : "text-slate"}>{k.label}</span>
              <span className="ml-auto font-semibold text-slate">{k.passed ? "yes" : "no"}</span>
            </p>
          ))}
        </div>
      </div>

      <div className="border-t border-slate/10 pt-4">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate">
          <MessageSquare size={13} /> The message, unedited · {v.sources?.length ?? 0}
        </p>
        <div className="flex flex-col gap-3">
          {(v.sources ?? []).map((s) => (
            <div key={s.id}>
              <p className="mb-1 text-[10.5px] text-slate">
                {s.sender} · {s.channel} · {when(s.sentAt)}
              </p>
              <div className="rounded-tr-2xl rounded-b-2xl rounded-tl border border-critical/25 bg-critical/10 px-3.5 py-2.5 text-sm italic leading-relaxed text-ink">
                “{s.excerpt}”
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-slate">
          Nothing has been deleted. If this turns out to be genuine, it is still in
          Announcements and still holds its place in your deadlines.
        </p>
      </div>
    </div>
  );
}

// ---- section ----------------------------------------------------------
export function VerifySection() {
  const { verify = [], announcements = [] } = useData();
  const [selected, setSelected] = useState(null);

  const checked = useMemo(
    () => announcements.filter((a) => a.trust?.status === "ok").length,
    [announcements]
  );

  return (
    <section>
      <style>{`
        @keyframes synq-node-in {
          from { opacity: 0; transform: translateY(14px) scale(0.96); }
          to { opacity: 1; transform: none; }
        }
      `}</style>

      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Check before you act</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate">
          Synq does not decide whether a message is genuine — it cannot know, and pretending
          otherwise would be inventing a fact. It compares what a message claims against what
          anyone else in your groups ever confirmed, and shows you the gap.
        </p>
      </header>

      {verify.length === 0 ? (
        <div
          className="rounded-xl2 border p-10 text-center"
          style={{ borderColor: "var(--hair)", background: "rgb(var(--c-surface))" }}
        >
          <ShieldCheck size={26} className="mx-auto mb-3 text-medium" />
          <p className="font-display text-base font-bold text-ink">
            {checked === 0
              ? "Nothing has been checked yet."
              : "Nothing here contradicts what it claims."}
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate">
            {checked === 0 ? (
              <>
                Import a chat and every item in it gets checked here — against who posted it,
                how many independent groups repeated it, and whether it asks for money or
                documents. The sample corpus was assembled before those checks existed.
              </>
            ) : (
              <>
                {checked} item{checked === 1 ? "" : "s"} were checked against who posted them,
                how many independent groups repeated them, and whether they asked for money or
                documents. None raised a decisive problem.
              </>
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 flex gap-2.5 rounded-xl border border-high/30 bg-high/10 px-4 py-3.5">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-high" />
            <div>
              <p className="text-sm font-bold text-ink">
                {verify.length} message{verify.length === 1 ? "" : "s"} could not be
                corroborated.
              </p>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink/75">
                Not deleted, not hidden, not called fake. A genuinely life-changing
                opportunity and a fraud can read almost identically, so burying either one
                would be a failure. They are here in full, with the reasons and a way to
                check.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {verify.map((v, i) => (
              <VerifyCard key={v.id} v={v} onOpen={setSelected} delay={i * 90} />
            ))}
          </div>
        </>
      )}

      <div
        className="mt-6 rounded-xl2 border p-5"
        style={{ borderColor: "var(--hair)", background: "rgb(var(--c-surface))" }}
      >
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate">
          <ShieldQuestion size={13} /> What the three rings mean
        </p>
        <p className="max-w-3xl text-xs leading-relaxed text-slate">
          A logo, a letterhead and an urgent tone cost nothing to copy, so none of them count
          as evidence. What cannot be faked from outside a campus is a trail — the same notice
          arriving from an account that has posted official notices before, repeated by a class
          rep or a department, in more than one group. Each ring is one of those checks, and an
          empty ring is the finding. On top of that, three things are treated as decisive:
          a request for payment, a request for identity or bank documents through an outside
          link, and a message claiming an office it does not speak for while asking you for
          something.
        </p>
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        accent={TONE.critical.fill}
      >
        {selected && <VerifyBody v={selected} />}
      </Drawer>
    </section>
  );
}

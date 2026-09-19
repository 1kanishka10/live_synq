import React, { useMemo, useState } from "react";
import {
  ShieldQuestion,
  ShieldCheck,
  AlertTriangle,
  Radio,
  MessageSquare,
  ListChecks,
  Link as LinkIcon,
  ChevronRight,
} from "lucide-react";
import { Card, Badge, Drawer } from "../components/ui";
import { useData } from "../data/DataContext";

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

const AUTHORITY_LABEL = {
  3: "a department or office account",
  2: "a class rep",
  1: "a society account",
  0: "an account Synq does not recognise",
};

export function VerifySection() {
  const { verify = [], announcements = [] } = useData();
  const [open, setOpen] = useState(null);

  const checked = useMemo(
    () => announcements.filter((a) => a.trust?.status === "ok").length,
    [announcements]
  );

  return (
    <section>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Check before you act</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate">
          Synq does not decide whether a message is genuine — it cannot know, and
          pretending otherwise would be inventing a fact. What it does is compare what a
          message claims against what anyone else in your groups ever confirmed, and show
          you the gap.
        </p>
      </header>

      {verify.length === 0 ? (
        <Card className="p-8 text-center">
          <ShieldCheck size={24} className="mx-auto mb-3 text-medium" />
          <p className="text-sm font-semibold text-ink">
            Nothing in this chat contradicts what it claims.
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate">
            {checked} item{checked === 1 ? "" : "s"} were checked against who posted them,
            how many independent channels repeated them, and whether they asked for money
            or documents. None of them raised a decisive problem.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-5 flex items-start gap-3 rounded-xl2 border border-high/30 bg-high/5 p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-high" />
            <div>
              <p className="text-sm font-semibold text-ink">
                {verify.length} message{verify.length === 1 ? "" : "s"} could not be
                corroborated.
              </p>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink/70">
                They have not been deleted, hidden or marked as fake. A genuinely
                life-changing opportunity and a fraud can read almost identically, so
                burying either one would be a failure. They are here, in full, with the
                reasons listed and a way to check.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {verify.map((v) => {
              const t = v.trust ?? {};
              const c = t.corroboration ?? {};
              return (
                <Card
                  key={v.id}
                  id={`item-${v.id}`}
                  onClick={() => setOpen(v)}
                  className="group cursor-pointer p-5 transition-transform hover:-translate-y-0.5"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="high">
                        <ShieldQuestion size={12} />
                        Verify before acting
                      </Badge>
                      <Badge tone="slate">{v.tag}</Badge>
                    </div>
                    <ChevronRight
                      size={16}
                      className="mt-1 shrink-0 text-slate transition-transform group-hover:translate-x-0.5"
                    />
                  </div>

                  <h3 className="font-display text-base font-bold leading-snug text-ink">
                    {v.title}
                  </h3>
                  {v.description && (
                    <p className="mt-1 text-sm leading-relaxed text-ink/70">
                      {v.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-col gap-2 border-t border-slate/15 pt-3">
                    {(t.reasons ?? []).map((r) => (
                      <p
                        key={r.code}
                        className="flex gap-2 text-xs leading-relaxed text-ink/85"
                      >
                        <AlertTriangle size={13} className="mt-0.5 shrink-0 text-critical" />
                        {r.headline}
                      </p>
                    ))}
                  </div>

                  <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate">
                    <Radio size={11} className="shrink-0" />
                    Seen {c.timesSeen ?? 1} time{c.timesSeen === 1 ? "" : "s"}, in{" "}
                    {c.channels ?? 1} channel{c.channels === 1 ? "" : "s"}, highest sender
                    authority: {AUTHORITY_LABEL[c.highestAuthority ?? 0]}.
                  </p>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Card className="mt-6 p-4">
        <p className="mb-2 text-sm font-semibold text-ink">What Synq is actually checking</p>
        <p className="max-w-3xl text-xs leading-relaxed text-slate">
          A logo, a letterhead and an urgent tone cost nothing to copy, so none of them
          count as evidence here. What cannot be faked from outside a campus is a trail:
          the same notice arriving from an account that has posted official notices before,
          repeated by a class rep or a department, in the channel that normally carries it,
          over more than one day. That trail is measured by the same code that collapses
          duplicates — authenticity leaves one, and a message sent once from an unknown
          number does not. On top of that, three things are treated as decisive on their
          own: a request for payment, a request for identity or bank documents through an
          outside link, and a message claiming an authority its sender does not have.
        </p>
      </Card>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ""}>
        {open && (
          <div className="flex flex-col gap-6">
            <p className="rounded-lg border border-high/30 bg-high/5 p-3 text-sm leading-relaxed text-ink/85">
              {open.trust?.summary}
            </p>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-critical">
                <AlertTriangle size={12} />
                What does not check out
              </p>
              <div className="flex flex-col gap-3">
                {(open.trust?.reasons ?? []).map((r) => (
                  <div key={r.code} className="rounded-lg border border-critical/25 p-3">
                    <p className="text-xs font-semibold text-ink">{r.headline}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink/70">{r.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {(open.trust?.notes ?? []).length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate">
                  Context — real, but not damning on its own
                </p>
                <div className="flex flex-col gap-3">
                  {open.trust.notes.map((r) => (
                    <div key={r.code} className="rounded-lg border border-slate/20 p-3">
                      <p className="text-xs font-semibold text-ink/90">{r.headline}</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink/60">{r.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(open.trust?.checks ?? []).length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky">
                  <ListChecks size={12} />
                  How to settle it in five minutes
                </p>
                <ol className="flex flex-col gap-2">
                  {open.trust.checks.map((c, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ocean text-[10px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="text-xs leading-relaxed text-ink/80">{c}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {(open.trust?.links ?? []).length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate">
                  <LinkIcon size={12} />
                  Where it points
                </p>
                <div className="flex flex-wrap gap-2">
                  {open.trust.links.map((h) => (
                    <span
                      key={h}
                      className="rounded-full border border-slate/25 px-3 py-1.5 font-mono text-[11px] text-slate"
                    >
                      {h}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate">
                  Shown as plain text on purpose. Synq will not make a link you have been
                  warned about easier to click.
                </p>
              </div>
            )}

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate">
                <MessageSquare size={12} />
                The message, unedited — {open.sources?.length ?? 0}
              </p>
              <div className="flex flex-col gap-2.5">
                {(open.sources ?? []).map((s) => (
                  <div key={s.id} className="rounded-lg border border-slate/20 p-2.5">
                    <p className="mb-1 text-[11px] text-slate">
                      {s.channel} · {s.sender} · {when(s.sentAt)}
                    </p>
                    <p className="text-xs leading-relaxed text-ink/80">"{s.excerpt}"</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate">
                Nothing has been deleted. If this turns out to be genuine, it is still in
                Announcements and still has its place in your deadlines.
              </p>
            </div>
          </div>
        )}
      </Drawer>
    </section>
  );
}

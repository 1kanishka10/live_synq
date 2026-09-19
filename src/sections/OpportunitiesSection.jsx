import React, { useMemo, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Eye,
  Layers,
  CalendarDays,
  Users,
  HelpCircle,
  MessageSquare,
  Link as LinkIcon,
  ChevronRight,
} from "lucide-react";
import { Card, Badge, Drawer } from "../components/ui";
import { authorityOf, priorityOf } from "../../lib/authority";
import { useData } from "../data/DataContext";

function dueLabel(o) {
  if (!o.deadline) return o.deadlineText || "No deadline stated";
  const d = new Date(o.deadline);
  if (Number.isNaN(d.getTime())) return o.deadlineText || "No deadline stated";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

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

function href(link) {
  if (!link) return null;
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

export function OpportunitiesSection() {
  const { opportunities, savedIds, saveOpportunity, unsaveOpportunity } = useData();
  const [onlySaved, setOnlySaved] = useState(false);
  const [open, setOpen] = useState(null);

  const sorted = useMemo(() => {
    return [...(opportunities || [])].sort((a, b) => {
      const byPriority = priorityOf(b) - priorityOf(a);
      if (byPriority !== 0) return byPriority;
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });
  }, [opportunities]);

  const isSaved = (id) => savedIds.includes(id);

  const toggle = (id) => {
    if (isSaved(id)) {
      unsaveOpportunity(id);
    } else {
      saveOpportunity(id);
    }
  };

  const visible = onlySaved ? sorted.filter((o) => isSaved(o.id)) : sorted;

  return (
    <section>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Campus Opportunities</h1>
          <p className="text-sm text-slate">
            Announced once and buried. Open any card to see the messages it came from.
          </p>
        </div>

        <button
          onClick={() => setOnlySaved((v) => !v)}
          className={
            onlySaved
              ? "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ocean px-3.5 py-2 text-xs font-semibold text-white"
              : "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate/25 px-3.5 py-2 text-xs font-medium text-slate hover:border-ocean hover:text-ink"
          }
        >
          <BookmarkCheck size={14} />
          Saved ({savedIds.length})
        </button>
      </header>

      {visible.length === 0 ? (
        <div className="py-16 text-center">
          <Bookmark size={22} className="mx-auto mb-3 text-slate" />
          {onlySaved ? (
            <>
              <p className="text-sm text-slate">
                Nothing saved yet. Tap the bookmark on any card to keep it here.
              </p>
              <button
                onClick={() => setOnlySaved(false)}
                className="mt-3 text-xs font-semibold text-ocean hover:underline"
              >
                Show all opportunities
              </button>
            </>
          ) : (
            <>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate">
                Nothing in this chat was an open opportunity. Everything Synq found had a
                stated deadline, so it is sitting in Deadlines instead.
              </p>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate">
                This screen only fills when a message offers something with no deadline
                attached — a spot on a team, a call for volunteers. Synq will not invent
                one to put a card here.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((o) => {
            const saved = isSaved(o.id);
            return (
              <Card
                key={o.id}
                id={`item-${o.id}`}
                onClick={() => setOpen(o)}
                className="group flex cursor-pointer flex-col gap-3 p-5 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="ocean">{o.category}</Badge>
                    {authorityOf(o).label && <Badge tone="medium">{authorityOf(o).label}</Badge>}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(o.id);
                    }}
                    aria-label={saved ? "Remove from saved" : "Save for later"}
                    className={saved ? "text-ocean" : "text-slate hover:text-ocean"}
                  >
                    {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                  </button>
                </div>

                <h3 className="font-display text-[15px] font-bold leading-snug text-ink">
                  {o.title}
                </h3>
                <p className="line-clamp-2 text-sm leading-relaxed text-ink/70">
                  {o.description}
                </p>

                {o.whyHere && (
                  <p className="line-clamp-1 flex items-center gap-1.5 text-xs italic text-sky">
                    <Eye size={11} className="shrink-0" />
                    {o.whyHere}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate/15 pt-3 text-xs text-slate">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={12} />
                    {dueLabel(o)}
                  </span>
                  <span className="flex items-center gap-2">
                    {o.sourceCount > 1 && (
                      <span className="inline-flex items-center gap-1">
                        <Layers size={11} />
                        {o.sourceCount}
                      </span>
                    )}
                    <ChevronRight
                      size={14}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ""}>
        {open && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="ocean">{open.category}</Badge>
              {open.confidence !== "stated" && <Badge tone="slate">Not confirmed</Badge>}
              {open.sourceCount > 1 && (
                <Badge tone="slate">merged from {open.sourceCount} messages</Badge>
              )}
            </div>

            <p className="text-sm leading-relaxed text-ink/80">{open.description}</p>

            {open.whyHere && (
              <div className="rounded-xl border border-sky/20 bg-sky/5 p-3.5">
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-sky">
                  <Eye size={11} />
                  Why you're seeing this
                </p>
                <p className="text-xs leading-relaxed text-ink/75">{open.whyHere}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Fact icon={CalendarDays} label="Deadline" value={dueLabel(open)} />
              <Fact icon={Users} label="Eligibility" value={open.eligibility} />
            </div>

            {open.deadlineText && (
              <Fact
                icon={MessageSquare}
                label="As written in the message"
                value={`"${open.deadlineText}"`}
              />
            )}

            {open.uncertainty && (
              <Fact
                icon={HelpCircle}
                label="What the message doesn't say"
                value={open.uncertainty}
              />
            )}

            {open.sources?.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate">
                  <MessageSquare size={11} />
                  Where this came from
                </p>
                <div className="flex flex-col gap-2">
                  {open.sources.map((s) => (
                    <div key={s.id} className="rounded-xl border border-slate/20 p-3">
                      <p className="mb-1 text-[11px] text-slate">
                        {s.channel} · {s.sender} · {when(s.sentAt)}
                      </p>
                      <p className="text-xs leading-relaxed text-ink/80">"{s.excerpt}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-slate/15 pt-4">
              {href(open.actionLink) ? (
                <a
                  href={href(open.actionLink)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-ocean px-5 py-2.5 text-sm font-semibold text-white"
                >
                  <LinkIcon size={15} />
                  Open the form
                </a>
              ) : (
                <p className="text-xs italic leading-relaxed text-slate">
                  No link was included in the original message. Details are in the quoted
                  text above.
                </p>
              )}

              <button
                onClick={() => toggle(open.id)}
                className={
                  isSaved(open.id)
                    ? "inline-flex items-center justify-center gap-2 rounded-full border border-ocean px-5 py-2.5 text-sm font-semibold text-ocean"
                    : "inline-flex items-center justify-center gap-2 rounded-full border border-slate/30 px-5 py-2.5 text-sm font-semibold text-ink"
                }
              >
                {isSaved(open.id) ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                {isSaved(open.id) ? "Saved" : "Save for later"}
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </section>
  );
}

function Fact({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate">
        <Icon size={11} />
        {label}
      </p>
      <p className="text-xs leading-relaxed text-ink/80">{value}</p>
    </div>
  );
}

import React, { useState } from "react";
import { Clock3, User, Link as LinkIcon, FileText, HelpCircle, MessageSquare } from "lucide-react";
import { Card, Badge, Drawer } from "../components/ui";
import { useData } from "../data/DataContext";
import { authorityOf } from "../../lib/authority";

function urgencyOf(hours) {
  if (hours == null) return { tone: "medium", label: "Not confirmed" };
  if (hours < 24) return { tone: "critical", label: "Critical" };
  if (hours < 72) return { tone: "high", label: "High" };
  return { tone: "medium", label: "Medium" };
}

function countdown(hours) {
  if (hours == null) return null;
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h left`;
}

function href(link) {
  if (!link) return null;
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

export function DeadlinesSection() {
   const [selected, setSelected] = useState(null);
  const { deadlines } = useData();
  const sorted = [...deadlines].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

  return (
    <section>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Urgent Deadlines</h1>
        <p className="text-sm text-slate">
          Ranked by what it costs you to miss them — not just by date.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {sorted.map((d) => {
          const urgency = urgencyOf(d.dueInHours);
          const left = countdown(d.dueInHours);
          return (
                        <Card
              key={d.id}
              id={`item-${d.id}`}
              className="cursor-pointer p-4 transition-transform hover:-translate-y-0.5"
              onClick={() => setSelected(d)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="mb-1 font-display text-[15px] font-bold text-ink">{d.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                                       <Badge tone="slate">{d.tag}</Badge>
                    {authorityOf(d).label && <Badge tone="medium">{authorityOf(d).label}</Badge>}
                    {d.sourceCount > 1 && (
                      <Badge tone="slate">{d.sourceCount} sources</Badge>
                    )}
                  </div>
                  {d.confidence !== "stated" && (
                    <p className="mt-2 text-xs italic leading-relaxed text-slate">
                      {d.deadlineText
                        ? `“${d.deadlineText}” — no date was ever stated`
                        : "No date was ever stated for this."}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge tone={urgency.tone}>{urgency.label}</Badge>
                  {left && (
                    <span className="flex items-center gap-1 text-xs text-slate">
                      <Clock3 size={12} />
                      {left}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? ""}>
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={urgencyOf(selected.dueInHours).tone}>
                {urgencyOf(selected.dueInHours).label}
              </Badge>
              <Badge tone="slate">{selected.tag}</Badge>
              {selected.sourceCount > 1 && (
                <Badge tone="slate">merged from {selected.sourceCount} messages</Badge>
              )}
            </div>

            <p className="text-sm leading-relaxed text-ink/80">{selected.description}</p>

            <DetailRow icon={Clock3} label="Deadline, as written" value={selected.deadlineText} />
            <DetailRow
              icon={HelpCircle}
              label="What the message doesn't say"
              value={selected.uncertainty}
            />
            <DetailRow icon={Clock3} label="Possible clash" value={selected.clashNote} />
            <DetailRow icon={FileText} label="Submission" value={selected.submission} />
            <DetailRow icon={User} label="Contact" value={selected.contact} />
            {selected.sources?.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate">
                  <MessageSquare size={13} />
                  Where this came from — {selected.sources.length}{" "}
                  {selected.sources.length === 1 ? "message" : "messages"}
                </p>
                <div className="flex flex-col gap-2">
                  {selected.sources.map((s) => (
                    <div key={s.id} className="rounded-xl border border-slate/20 p-3">
                      <p className="mb-1 text-[11px] text-slate">
                        {s.channel} · {s.sender}
                        {s.sentAt
                          ? " · " +
                            new Date(s.sentAt).toLocaleString(undefined, {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                      <p className="text-xs leading-relaxed text-ink/80">"{s.excerpt}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
                        {href(selected.actionLink) ? (
              <a
                href={href(selected.actionLink)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-ocean px-5 py-2.5 text-sm font-semibold text-white hover:bg-ocean-dark"
              >
                <LinkIcon size={15} />
                Open submission link
              </a>
            ) : (
              <p className="text-xs italic text-slate">
                No link was included in the original message.
              </p>
            )}
          </div>
        )}
      </Drawer>
    </section>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate">
        <Icon size={13} />
        {label}
      </p>
      <p className="text-sm leading-relaxed text-ink/80">{value}</p>
    </div>
  );
}

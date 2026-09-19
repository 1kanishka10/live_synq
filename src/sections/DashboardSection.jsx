import React, { useMemo, useState } from "react";
import {
  Layers,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Clock3,
  Inbox,
  ShieldQuestion,
} from "lucide-react";
import { Card, Badge } from "../components/ui";
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

export function DashboardSection({ onNavigate }) {
  const { stats = {}, deadlines = [], missed = [], source } = useData();

  const [pickedId, setPickedId] = useState(null);
  const [showAllNoise, setShowAllNoise] = useState(false);

  // Rebuilt whenever the dataset changes — an import swaps every number here.
  const funnel = useMemo(
    () => [
      { icon: Inbox, value: stats.messages_in ?? 0, label: "messages read", tone: "text-sky" },
      { icon: Layers, value: stats.duplicates_collapsed ?? 0, label: "duplicates collapsed", tone: "text-ocean" },
      { icon: Filter, value: stats.noise_dropped ?? 0, label: "dropped as noise", tone: "text-slate" },
      { icon: CheckCircle2, value: stats.items_total ?? 0, label: "real items kept", tone: "text-medium" },
    ],
    [stats]
  );

  const ranked = useMemo(
    () => [...deadlines].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)),
    [deadlines]
  );

  const noiseExamples = stats.noiseExamples ?? [];

  // pickedId is held loosely: after an import the old id no longer exists,
  // so fall back to the top-ranked item rather than showing an empty panel.
  const picked = ranked.find((d) => d.id === pickedId) ?? ranked[0];

  return (
    <section className="flex flex-col gap-8">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky">
          {source === "imported" ? "Your imported chat" : "Snapshot · 15 September 2026"}
        </p>
        <h1 className="font-display text-3xl font-bold leading-tight text-ink lg:text-[2.6rem]">
          {stats.messages_in ?? 0} messages in.{" "}
          <span className="text-sky">{stats.now ?? ranked.length} things</span> you actually
          have to do.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/70">
          Synq read every message in your campus groups, worked out what each one was
          asking of you, and set the rest aside. Nothing below was written by us — all of
          it was pulled out of what people actually posted.
        </p>
      </header>

      {(stats.needs_verifying ?? 0) > 0 && (
        <button
          onClick={() => onNavigate?.("verify")}
          className="flex items-start gap-3 rounded-xl2 border border-high/40 bg-high/5 p-4 text-left transition-transform hover:-translate-y-0.5"
        >
          <ShieldQuestion size={19} className="mt-0.5 shrink-0 text-high" />
          <span>
            <span className="block text-sm font-semibold text-ink">
              {stats.needs_verifying} message
              {stats.needs_verifying === 1 ? "" : "s"} asked you for something Synq could
              not corroborate.
            </span>
            <span className="mt-1 block max-w-2xl text-xs leading-relaxed text-ink/70">
              Not deleted, not called fake — the reasons are listed and it is still in your
              feed. Open Check before you act.
            </span>
          </span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {funnel.map(({ icon: Icon, value, label, tone }) => (
          <Card key={label} className="p-4">
            <Icon size={17} className={tone} />
            <p className="mt-2 font-display text-3xl font-bold text-ink">{value}</p>
            <p className="text-xs leading-snug text-slate">{label}</p>
          </Card>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-sky" />
          <h2 className="font-display text-lg font-bold text-ink">How Synq read it</h2>
        </div>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-ink/70">
          Pick any item to see the raw messages it came from and what the model pulled out
          of them.
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {ranked.map((d) => (
            <button
              key={d.id}
              onClick={() => setPickedId(d.id)}
              className={
                d.id === picked?.id
                  ? "rounded-full bg-ocean px-3.5 py-1.5 text-xs font-semibold text-white"
                  : "rounded-full border border-slate/25 px-3.5 py-1.5 text-xs font-medium text-slate hover:border-ocean hover:text-ink"
              }
            >
              {d.title}
              {d.sourceCount > 1 ? ` · ${d.sourceCount}` : ""}
            </button>
          ))}
        </div>

        {picked && (
          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate">
                <Inbox size={13} />
                What arrived — {picked.sources?.length ?? 0}{" "}
                {picked.sources?.length === 1 ? "message" : "messages"}
              </p>
              <div className="flex flex-col gap-2.5">
                {(picked.sources ?? []).map((s) => (
                  <div key={s.id} className="rounded-lg border border-slate/20 p-2.5">
                    <p className="mb-1 text-[11px] text-slate">
                      {s.channel} · {s.sender} · {when(s.sentAt)}
                    </p>
                    <p className="text-xs leading-relaxed text-ink/80">"{s.excerpt}"</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky">
                <Sparkles size={13} />
                What the model pulled out
              </p>
              <div className="flex flex-col gap-3">
                <Field label="Item" value={picked.title} />
                <Field label="What to do" value={picked.description} />
                <Field label="Deadline, as written" value={picked.deadlineText} quoted />
                <Field label="If you miss it" value={picked.consequence} />
                <Field label="What the message doesn't say" value={picked.uncertainty} />
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate">
                    Confidence
                  </p>
                  <Badge tone={picked.confidence === "stated" ? "medium" : "high"}>
                    {picked.confidence}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        )}

        <p className="mt-3 text-xs leading-relaxed text-slate">
          Extraction — reading each message and deciding what it asks of you — is done by a
          language model. Collapsing duplicates and ranking are plain code running on what
          the model returned.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Clock3 size={16} className="text-critical" />
            <h2 className="font-display text-lg font-bold text-ink">Needs you now</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {ranked.slice(0, 3).map((d) => (
              <Card
                key={d.id}
                onClick={() => onNavigate?.("deadlines")}
                className="cursor-pointer p-3.5 transition-transform hover:-translate-y-0.5"
              >
                <p className="font-display text-sm font-bold text-ink">{d.title}</p>
                <p className="mt-1 text-xs text-slate">
                  {d.dueInHours == null
                    ? "Date not confirmed"
                    : d.dueInHours < 24
                      ? `${d.dueInHours}h left`
                      : `${Math.floor(d.dueInHours / 24)}d left`}{" "}
                  · {d.tag}
                </p>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-high" />
            <h2 className="font-display text-lg font-bold text-ink">
              Already gone — {missed.length} things
            </h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {missed.length === 0 ? (
              <Card className="p-3.5">
                <p className="text-xs leading-relaxed text-slate">
                  Nothing in this chat had a deadline that has already passed.
                </p>
              </Card>
            ) : (
              missed.slice(0, 3).map((m) => (
                <Card key={m.id} className="p-3.5">
                  <p className="font-display text-sm font-bold text-ink">{m.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink/65">
                    {m.issue || m.description}
                  </p>
                </Card>
              ))
            )}
          </div>
          <p className="mt-2.5 text-xs text-slate">
            Shown rather than hidden, so you know what you missed and why.
          </p>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Filter size={16} className="text-slate" />
          <h2 className="font-display text-lg font-bold text-ink">
            Dropped as noise — and why
          </h2>
        </div>
        <Card className="p-4">
          <div className="flex flex-col gap-3">
            {(showAllNoise ? noiseExamples : noiseExamples.slice(0, 6)).map((n) => (
              <div key={n.id} className="flex gap-2.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate" />
                <div>
                  <p className="text-xs leading-relaxed text-ink/70">{n.why}</p>
                  {n.channel && (
                    <p className="mt-0.5 text-[10px] text-slate">{n.channel}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {noiseExamples.length > 6 && (
            <button
              onClick={() => setShowAllNoise((v) => !v)}
              className="mt-3 text-xs font-semibold text-ocean hover:underline"
            >
              {showAllNoise ? "Show fewer" : `Show all ${noiseExamples.length}`}
            </button>
          )}

          <p className="mt-3 text-xs text-slate">
            {stats.noise_dropped ?? 0} of {stats.messages_in ?? 0} messages were set aside.
            Every one of them is still searchable — nothing is deleted.
          </p>
        </Card>
      </div>
    </section>
  );
}

function Field({ label, value, quoted }) {
  if (!value) return null;
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate">
        {label}
      </p>
      <p className="text-xs leading-relaxed text-ink/80">
        {quoted ? `"${value}"` : value}
      </p>
    </div>
  );
}

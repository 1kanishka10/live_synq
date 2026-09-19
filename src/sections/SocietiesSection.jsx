import React, { useMemo, useState } from "react";
import { Users, ShieldQuestion, Radio, Layers } from "lucide-react";
import clsx from "clsx";
import { Modal } from "../components/ui";
import { useData } from "../data/DataContext";
import { tierOfSender } from "../../lib/authority";

// Who actually announces things in your groups, built from the messages
// themselves rather than a curated list. A directory that came from a JSON file
// could not survive an import; this one is the import.

// Written out in full: Tailwind only keeps classes it can find as literal text.
const TIER = {
  3: { label: "Office", chip: "bg-medium/15 text-medium", ring: "border-medium/30" },
  2: { label: "Class rep", chip: "bg-ocean/15 text-ocean-light", ring: "border-ocean/30" },
  1: { label: "Society", chip: "bg-sky/15 text-sky", ring: "border-sky/30" },
  0: { label: "Unrecognised", chip: "bg-slate/15 text-slate", ring: "border-slate/25" },
};

const LANE = {
  now: "Needs you now",
  discover: "Worth discovering",
  missed: "Already closed",
};

function sizeOf(count) {
  if (count >= 4) return "large";
  if (count >= 2) return "medium";
  return "small";
}

// One row per sender, with everything they were responsible for.
function buildSenders(announcements = []) {
  const map = new Map();

  for (const item of announcements) {
    for (const s of item.sources ?? []) {
      const name = (s.sender || "").trim();
      if (!name) continue;
      if (!map.has(name)) {
        map.set(name, {
          name,
          tier: tierOfSender(name),
          channels: new Set(),
          items: [],
          flagged: 0,
        });
      }
      const row = map.get(name);
      if (s.channel) row.channels.add(s.channel);
      // A sender can appear twice in one item's history — count the item once.
      if (!row.items.some((i) => i.id === item.id)) {
        row.items.push(item);
        if (item.trust?.status === "verify") row.flagged += 1;
      }
    }
  }

  return [...map.values()]
    .map((r) => ({ ...r, channels: [...r.channels] }))
    .sort((a, b) => b.items.length - a.items.length || b.tier - a.tier);
}

function Cell({ s, size, onOpen }) {
  const tier = TIER[s.tier] ?? TIER[0];
  return (
    <button
      onClick={() => onOpen(s)}
      className={clsx(
        "flex cursor-pointer flex-col overflow-hidden rounded-xl2 border bg-surface p-4 text-left transition-transform hover:-translate-y-0.5",
        s.flagged > 0 ? "border-critical/40" : tier.ring,
        size === "large" && "col-span-2 row-span-2 p-6",
        size === "medium" && "col-span-2",
        size === "small" && "col-span-1"
      )}
    >
      <span className="mb-2 flex w-fit items-center gap-1.5">
        <span className={clsx("rounded-full px-2 py-0.5 text-[9.5px] font-bold", tier.chip)}>
          {tier.label}
        </span>
        {s.flagged > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-critical/15 px-2 py-0.5 text-[9.5px] font-bold text-critical">
            <ShieldQuestion size={10} />
            {s.flagged}
          </span>
        )}
      </span>

      <p
        className={clsx(
          "font-display font-bold leading-tight text-ink",
          size === "large" ? "mb-1 text-lg" : "mb-0.5 text-[13.5px]"
        )}
      >
        {s.name}
      </p>

      <p className="text-[10.5px] leading-snug text-ink/70">
        {s.items.length} notice{s.items.length === 1 ? "" : "s"} · {s.channels.length} group
        {s.channels.length === 1 ? "" : "s"}
      </p>

      {size === "large" && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {s.items.slice(0, 3).map((i) => (
            <span
              key={i.id}
              className="truncate border-l-2 border-ocean/40 pl-2 text-[10px] leading-snug text-ink/85"
            >
              {i.title}
            </span>
          ))}
          {s.items.length > 3 && (
            <span className="pl-2 text-[10px] text-slate">+{s.items.length - 3} more</span>
          )}
        </div>
      )}
    </button>
  );
}

export function SocietiesSection() {
  const { announcements = [] } = useData();
  const senders = useMemo(() => buildSenders(announcements), [announcements]);

  const tiers = useMemo(() => {
    const present = [...new Set(senders.map((s) => s.tier))].sort((a, b) => b - a);
    return ["All", ...present.map((t) => (TIER[t] ?? TIER[0]).label)];
  }, [senders]);

  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);

  const visible =
    filter === "All"
      ? senders
      : senders.filter((s) => (TIER[s.tier] ?? TIER[0]).label === filter);

  const officeCount = senders.filter((s) => s.tier === 3).length;
  const unknownCount = senders.filter((s) => s.tier === 0).length;

  return (
    <section>
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink">Who announces things here</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate">
          Every account that posted something Synq kept, sized by how much it posted. This is
          the same sender tiering that decides what outranks what — and the reason an
          unrecognised account asking for money stands out.
        </p>
      </header>

      {senders.length === 0 ? (
        <div
          className="rounded-xl2 border p-10 text-center"
          style={{ borderColor: "var(--hair)", background: "rgb(var(--c-surface))" }}
        >
          <Users size={24} className="mx-auto mb-3 text-slate" />
          <p className="font-display text-base font-bold text-ink">Nothing imported yet.</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate">
            Import your chat exports and this fills with the accounts that actually post in
            them.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate">
            <span className="flex items-center gap-1.5">
              <Radio size={12} />
              {senders.length} accounts posting
            </span>
            <span className="flex items-center gap-1.5">
              <Layers size={12} />
              {officeCount} recognised office{officeCount === 1 ? "" : "s"}
            </span>
            {unknownCount > 0 && (
              <span className="flex items-center gap-1.5 text-high">
                <ShieldQuestion size={12} />
                {unknownCount} account{unknownCount === 1 ? "" : "s"} Synq does not recognise
              </span>
            )}
          </div>

          {tiers.length > 2 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {tiers.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={clsx(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                    filter === t
                      ? "border-ocean bg-ocean text-canvas"
                      : "border-slate/20 bg-surface text-ink/70 hover:border-ocean"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((s) => (
              <Cell key={s.name} s={s} size={sizeOf(s.items.length)} onOpen={setSelected} />
            ))}
          </div>
        </>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
      >
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={clsx(
                  "rounded-full px-2.5 py-1 text-[11px] font-bold",
                  (TIER[selected.tier] ?? TIER[0]).chip
                )}
              >
                {(TIER[selected.tier] ?? TIER[0]).label}
              </span>
              <span className="text-[11px] text-slate">
                {selected.channels.join(" · ")}
              </span>
            </div>

            {selected.tier === 0 && (
              <p className="rounded-xl border border-high/30 bg-high/10 px-3.5 py-3 text-xs leading-relaxed text-ink/90">
                Synq has no record of this account posting official notices before. That is not
                an accusation — new accounts and forwarded messages look the same. It only
                counts against a message when that message is also asking for money, documents
                or a click.
              </p>
            )}

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate">
                What they posted — {selected.items.length}
              </p>
              <div className="flex flex-col gap-2">
                {selected.items.map((i) => (
                  <div
                    key={i.id}
                    className={clsx(
                      "rounded-xl border px-3.5 py-2.5",
                      i.trust?.status === "verify"
                        ? "border-critical/30 bg-critical/10"
                        : "border-slate/20"
                    )}
                  >
                    <p className="text-xs font-semibold text-ink">{i.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10.5px] text-slate">
                      <span>{LANE[i.lane] ?? "Announcement"}</span>
                      {i.date && <span>· {i.date}</span>}
                      {i.trust?.status === "verify" && (
                        <span className="font-bold text-critical">· needs verifying</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

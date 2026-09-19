import React, { useState, useMemo } from "react";
import { Users, TriangleAlert } from "lucide-react";
import clsx from "clsx";
import { Modal } from "../components/ui";
import { useData } from "../data/DataContext";

// Cell size reflects how much is actually going on — not hand-picked, so it
// stays correct as the underlying data changes.
function weightOf(s) {
  return (s.core?.length ?? 0) + (s.upcomingEvents?.length ?? 0) + (s.pastEvents?.length ?? 0);
}
function sizeOf(s) {
  const w = weightOf(s);
  if (w >= 8) return "large";
  if (w >= 3) return "medium";
  return "small";
}

// The one pair in the data whose events clash on the same day/time — pulled
// out of the normal grid and rendered as one linked, alarm-colored cell
// instead of two ordinary small ones.
const CLASH_PAIR = ["s14", "s15"];

function Cell({ s, size, onOpen }) {
  return (
    <div
      onClick={() => onOpen(s)}
      className={clsx(
        "flex cursor-pointer flex-col overflow-hidden rounded-xl2 border border-white/10 bg-surface p-4 transition-transform hover:-translate-y-0.5",
        size === "large" && "col-span-2 row-span-2 p-6",
        size === "medium" && "col-span-2",
        size === "small" && "col-span-1"
      )}
    >
      <span className="mb-2 w-fit rounded-full bg-slate/15 px-2 py-0.5 text-[9.5px] font-bold text-slate">
        {s.category}
      </span>
      <p className={clsx("font-display font-bold leading-tight text-ink", size === "large" ? "text-lg mb-1" : "text-[13.5px] mb-0.5")}>
        {s.name}
      </p>
      <p className="text-[10.5px] leading-snug text-ink/70">{s.description}</p>
      {size === "large" && s.upcomingEvents?.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {[...new Set(s.upcomingEvents)].slice(0, 3).map((e, i) => (
            <span key={i} className="border-l-2 border-ocean/40 pl-2 text-[10px] leading-snug text-ink/85">
              {e}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ClashCell({ a, b, onOpen }) {
  return (
    <div className="col-span-2 flex flex-col overflow-hidden rounded-xl2 border border-critical/45">
      <div className="flex items-center gap-1.5 bg-critical/15 px-3.5 py-1.5">
        <TriangleAlert size={12} className="text-critical" />
        <span className="text-[9.5px] font-bold uppercase tracking-wide text-critical">
          Clash detected — same day, 4 PM
        </span>
      </div>
      <div className="flex flex-1">
        {[a, b].map((s, i) => (
          <button
            key={s.id}
            onClick={() => onOpen(s)}
            className={clsx(
              "flex-1 bg-surface px-3.5 py-2.5 text-left transition-colors hover:bg-critical/5",
              i === 0 && "border-r border-dashed border-critical/25"
            )}
          >
            <p className="text-xs font-bold text-ink">{s.name}</p>
            <p className="text-[10px] text-ink/70">{s.category}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SocietiesSection() {
  const { societies = [] } = useData();
  const CATEGORIES = useMemo(
    () => ["All", ...[...new Set(societies.map((s) => s.category))].sort()],
    [societies]
  );

  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(null);

  const filtered = category === "All" ? societies : societies.filter((s) => s.category === category);
  const clashSocieties = useMemo(
    () => CLASH_PAIR.map((id) => societies.find((s) => s.id === id)).filter(Boolean),
    [societies]
  );
  const showClash = category === "All" || clashSocieties.some((s) => s.category === category);
  const gridItems = filtered.filter((s) => !CLASH_PAIR.includes(s.id));

  return (
    <section>
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink">Campus Societies Directory</h1>
        <p className="text-sm text-slate">Sized by how much is actually happening.</p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={clsx(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              category === c
                ? "border-ocean bg-ocean text-canvas"
                : "border-slate/20 bg-surface text-ink/70 hover:border-ocean"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
        {showClash && clashSocieties[0] && clashSocieties[1] && (
          <ClashCell a={clashSocieties[0]} b={clashSocieties[1]} onOpen={setSelected} />
        )}
        {gridItems.map((s) => (
          <Cell key={s.id} s={s} size={sizeOf(s)} onOpen={setSelected} />
        ))}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ""}>
        {selected && (
          <div className="flex flex-col gap-5">
            <p className="text-sm leading-relaxed text-ink/80">{selected.description}</p>
            <DetailList label="Core team" items={selected.core} />
            <DetailList label="Past events" items={selected.pastEvents} />
            <DetailList label="Upcoming events" items={[...new Set(selected.upcomingEvents)]} />
          </div>
        )}
      </Modal>
    </section>
  );
}

function DetailList({ label, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-slate">{label}</p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-ink/80">• {item}</li>
        ))}
      </ul>
    </div>
  );
}

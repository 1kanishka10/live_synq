import React, { useMemo, useState } from "react";
import { Users } from "lucide-react";
import clsx from "clsx";
import { Card, Modal } from "../components/ui";
import { useData } from "../data/DataContext";

export function SocietiesSection() {
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(null);
  const { societies } = useData();

  // Built from the data, so every chip returns something.
  const CATEGORIES = useMemo(
    () => ["All", ...[...new Set(societies.map((s) => s.category))].sort()],
    [societies]
  );
  const filtered = category === "All" ? societies : societies.filter((s) => s.category === category);

  return (
    <section>
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink">Campus Societies Directory</h1>
        <p className="text-sm text-slate">Filter by category to find your people.</p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={clsx(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              category === c
                ? "border-ocean bg-ocean text-white"
                : "border-slate/20 bg-surface text-ink/70 hover:border-ocean"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s) => (
          <Card
            key={s.id}
            className="cursor-pointer p-5 transition-transform hover:-translate-y-0.5"
            onClick={() => setSelected(s)}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-ocean">
              <Users size={18} />
            </div>
            <h3 className="font-display text-[15px] font-bold text-ink">{s.name}</h3>
            <p className="mt-1 text-xs font-medium text-ocean">{s.category}</p>
            <p className="mt-2 text-sm text-ink/70 leading-relaxed line-clamp-2">{s.description}</p>
          </Card>
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

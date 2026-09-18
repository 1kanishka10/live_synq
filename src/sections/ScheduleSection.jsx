import React, { useMemo } from "react";
import { AlertTriangle, CalendarDays, HelpCircle } from "lucide-react";
import { Card, Badge } from "../components/ui";
import { useData } from "../data/DataContext";



// Group deadlines whose due-times land within 6 hours of each other.
function findClashes(items, toleranceHours = 6) {
  const sorted = [...items].sort((a, b) => a.dueInHours - b.dueInHours);
  const groups = [];
  let current = [];

  for (const item of sorted) {
    if (
      current.length === 0 ||
      item.dueInHours - current[current.length - 1].dueInHours <= toleranceHours
    ) {
      current.push(item);
    } else {
      if (current.length > 1) groups.push(current);
      current = [item];
    }
  }
  if (current.length > 1) groups.push(current);
  return groups;
}

function whenLabel(hours) {
  if (hours == null) return "Date not confirmed";
  if (hours < 24) return `In ${hours}h`;
  return `In ${Math.floor(hours / 24)}d`;
}

export function ScheduleSection() {
  // Only items with a confirmed time can be placed on a timeline or compared.
  const { dated, undated } = useMemo(
    
    () => ({
      dated: deadlines.filter((d) => d.dueInHours != null),
      undated: deadlines.filter((d) => d.dueInHours == null),
    }),
    [deadlines]
  );
  
  const clashes = findClashes(dated);
  const flagged = deadlines.filter((d) => d.clashNote);
  const timeline = [
    ...[...dated].sort((a, b) => a.dueInHours - b.dueInHours),
    ...undated,
  ];

  return (
    <section>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">
          Schedule &amp; Clashing Deadlines
        </h1>
        <p className="text-sm text-slate">
          Only items with a confirmed date are compared. The rest are listed, not guessed at.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3">
        {flagged.map((d) => (
          <Card key={d.id} className="border-high/30 bg-high/5 p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-high" />
              <div>
                <p className="text-sm font-semibold text-high">
                  Possible clash — {d.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink/70">{d.clashNote}</p>
              </div>
            </div>
          </Card>
        ))}

        {clashes.map((group, i) => (
          <Card key={`c${i}`} className="border-critical/30 bg-critical/5 p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-critical" />
              <div>
                <p className="text-sm font-semibold text-critical">
                  Conflict: {group.length} deadlines fall within hours of each other
                </p>
                <p className="mt-1 text-sm text-ink/70">
                  {group.map((g) => g.title).join(" · ")}
                </p>
              </div>
            </div>
          </Card>
        ))}

        {undated.length > 0 && (
          <Card className="p-4">
            <div className="flex items-start gap-2.5">
              <HelpCircle size={18} className="mt-0.5 shrink-0 text-slate" />
              <div>
                <p className="text-sm font-semibold text-ink">
                  {undated.length} items could not be placed on the timeline
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink/70">
                  No date was ever stated for {undated.map((d) => d.title).join(" or ")}.
                  They are kept here rather than given an invented date.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <CalendarDays size={16} className="text-ocean" />
          Timeline
        </div>
        <div className="flex flex-col">
          {timeline.map((d, i) => (
            <div key={d.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={
                    d.dueInHours == null
                      ? "h-2.5 w-2.5 rounded-full border border-slate/60"
                      : "h-2.5 w-2.5 rounded-full bg-ocean"
                  }
                />
                {i < timeline.length - 1 && <span className="w-px flex-1 bg-slate/20" />}
              </div>
              <div className="pb-6">
                <p className="text-xs text-slate">{whenLabel(d.dueInHours)}</p>
                <p className="text-sm font-medium text-ink">{d.title}</p>
                <Badge tone="slate" className="mt-1">
                  {d.tag}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

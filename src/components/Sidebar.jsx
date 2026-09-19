import React from "react";
import { LayoutDashboard, AlarmClock, Compass, CalendarDays, CalendarClock, Users, Search, ShieldQuestion } from "lucide-react";
import clsx from "clsx";
import { SynqMark } from "./SynqMark";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "deadlines", label: "Urgent Deadlines", icon: AlarmClock },
  { key: "opportunities", label: "Opportunities", icon: Compass },
  { key: "verify", label: "Verify", icon: ShieldQuestion },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "search", label: "Announcements", icon: Search },
];

export function Sidebar({ active, onChange }) {
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0 glass-dark text-white">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ocean text-white">
                    <SynqMark size={20} />
        </div>
                <span className="font-display text-lg font-bold">Synq</span>
      </div>
      <nav className="flex-1 px-3 py-2">
        {NAV.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={clsx(
                "mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                isActive ? "bg-ocean text-white font-semibold" : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={17} />
              {label}
            </button>
          );
        })}
      </nav>
      <div className="px-6 py-5 text-xs text-white/40">v0.1 · 50 messages processed. </div>
    </aside>
  );
}

export function MobileNav({ active, onChange }) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-dark text-white">
      <div className="flex overflow-x-auto">
        {NAV.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={clsx(
                "flex flex-1 min-w-[76px] flex-col items-center gap-1 py-2.5 text-[10px]",
                isActive ? "text-ocean" : "text-white/60"
              )}
            >
              <Icon size={18} className={isActive ? "text-sky" : ""} />
              {label.split(" ")[0]}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

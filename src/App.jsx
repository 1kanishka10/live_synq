import React, { useEffect, useState } from "react";
import { Sidebar, MobileNav } from "./components/Sidebar";
import { ImportButton } from "./components/ImportButton";
import { SynqMark } from "./components/SynqMark";
import { GlobalSearch } from "./components/GlobalSearch";
import { NotificationBell } from "./components/NotificationBell";
import { ThemeToggle } from "./components/ThemeToggle";
import { DashboardSection } from "./sections/DashboardSection";
import { DeadlinesSection } from "./sections/DeadlinesSection";
import { OpportunitiesSection } from "./sections/OpportunitiesSection";
import { CalendarSection } from "./sections/CalendarSection";
import { SocietiesSection } from "./sections/SocietiesSection";
import { SearchSection } from "./sections/SearchSection";

const SECTION_LABEL = {
  dashboard: "Dashboard",
  deadlines: "Urgent Deadlines",
  opportunities: "Campus Opportunities",
  calendar: "Calendar",
  societies: "Societies Directory",
  search: "Announcements",
};

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [focus, setFocus] = useState(null);

  // Jump to a tab, optionally pointing at one item inside it.
  function goTo(nextTab, itemId = null) {
    setTab(nextTab);
    setFocus(itemId ? { id: itemId, at: Date.now() } : null);
  }

  // After the new tab paints, scroll that card into view and ring it briefly.
  useEffect(() => {
    if (!focus) return;
    let clear;
    const find = setTimeout(() => {
      const el = document.getElementById(`item-${focus.id}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.outline = "2px solid #2F5FE0";
      el.style.outlineOffset = "3px";
      clear = setTimeout(() => {
        el.style.outline = "";
        el.style.outlineOffset = "";
      }, 2600);
    }, 60);
    return () => {
      clearTimeout(find);
      clearTimeout(clear);
    };
  }, [focus]);

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar active={tab} onChange={goTo} />

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-white/60 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ocean text-white">
              <SynqMark size={18} />
            </div>
            <span className="font-display text-base font-bold text-ink">Synq</span>
          </div>

          <GlobalSearch onNavigate={goTo} />

          <div className="flex items-center gap-2">
            <ImportButton />
             <ThemeToggle />
            <NotificationBell onNavigate={goTo} />
          </div>
        </header>

        <main className="flex-1 px-5 pb-24 pt-6 lg:px-8 lg:pb-10">
          {tab === "dashboard" && <DashboardSection onNavigate={goTo} />}
          {tab === "deadlines" && <DeadlinesSection />}
          {tab === "opportunities" && <OpportunitiesSection />}
          {tab === "calendar" && <CalendarSection onNavigate={goTo} />}
          {tab === "societies" && <SocietiesSection />}
          {tab === "search" && <SearchSection />}
        </main>
      </div>

      <MobileNav active={tab} onChange={goTo} />
    </div>
  );
}

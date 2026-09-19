import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, MessageSquare, Bookmark, BookmarkCheck } from "lucide-react";
import { priorityOf } from "../../lib/authority";
import { useData } from "../data/DataContext";

function formatDeadline(iso) {
  if (!iso) return "No deadline stated";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long" });
}

export function OpportunitiesSection() {
  // Saved items now persist in Supabase rather than this browser's localStorage,
  // so a bookmark survives a different device. The call sites below still treat
  // savedIds as a Set, so the layout is untouched.
  const {
    opportunities = [],
    savedIds: savedList = [],
    saveOpportunity,
    unsaveOpportunity,
  } = useData();

  const sorted = useMemo(
    () => [...opportunities].sort((a, b) => priorityOf(b) - priorityOf(a)),
    [opportunities]
  );

  const savedIds = useMemo(() => new Set(savedList), [savedList]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [selected, setSelected] = useState(0);
  const stripRef = useRef(null);
  const cardRefs = useRef([]);

  function toggleSave(id, e) {
    e.stopPropagation(); // don't let the bookmark click also select the card
    if (savedIds.has(id)) unsaveOpportunity(id);
    else saveOpportunity(id);
  }

  const list = useMemo(
    () => (showSavedOnly ? sorted.filter((o) => savedIds.has(o.id)) : sorted),
    [sorted, showSavedOnly, savedIds]
  );

  // Whenever the visible list changes (toggling the saved filter, or a save/
  // unsave that changes which items are in it), old card indices no longer
  // line up — reset to the start instead of pointing at the wrong item.
  useEffect(() => {
    setSelected(0);
    stripRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [showSavedOnly, list.length]);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;

    function updateActive() {
      const rect = strip.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      let closestIdx = 0;
      let closestDist = Infinity;
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dist = Math.abs(r.left + r.width / 2 - center);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      });
      setSelected((prev) => (prev === closestIdx ? prev : closestIdx));
    }

    let raf;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateActive);
    };
    strip.addEventListener("scroll", onScroll);
    window.addEventListener("resize", updateActive);
    updateActive();

    return () => {
      strip.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateActive);
      cancelAnimationFrame(raf);
    };
  }, [list.length]);

  function goTo(i) {
    const clamped = Math.max(0, Math.min(list.length - 1, i));
    cardRefs.current[clamped]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setSelected(clamped);
  }

  const active = list[selected];

  return (
    <section>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1 text-center">
          <h1 className="font-display text-2xl font-bold text-ink">Campus Opportunities</h1>
          <p className="text-sm text-slate">Scroll, drag, or use the arrows. The centered one is shown below.</p>
        </div>
        <button
          onClick={() => setShowSavedOnly((v) => !v)}
          className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors"
          style={{
            borderColor: showSavedOnly ? "rgb(var(--c-ocean) / 0.55)" : "var(--hair)",
            background: showSavedOnly ? "rgb(var(--c-ocean) / 0.14)" : "transparent",
            color: showSavedOnly ? "rgb(var(--c-ocean-light))" : "rgb(var(--c-slate))",
          }}
        >
          <BookmarkCheck size={13} /> Saved ({savedIds.size})
        </button>
      </header>

      {list.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate">
          Nothing saved yet — tap the bookmark on any card to keep it here.
        </p>
      ) : (
        <>
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => goTo(selected - 1)}
              disabled={selected === 0}
              className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-surface text-ink transition-colors hover:border-ocean/50 hover:text-ocean-light disabled:opacity-30"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>

            <div
              ref={stripRef}
              className="mx-3 flex max-w-3xl gap-5 overflow-x-auto scroll-smooth"
              style={{ scrollSnapType: "x proximity", padding: "20px calc(50% - 160px)", scrollbarWidth: "none" }}
            >
              {list.map((o, i) => {
                const isActive = i === selected;
                const isSaved = savedIds.has(o.id);
                return (
                  <div
                    key={o.id}
                    ref={(el) => (cardRefs.current[i] = el)}
                    onClick={() => goTo(i)}
                    className="relative flex h-[300px] w-80 shrink-0 cursor-pointer flex-col justify-end overflow-hidden rounded-xl2 border p-6 transition-all duration-400"
                    style={{
                      scrollSnapAlign: "center",
                      transform: isActive ? "scale(1)" : "scale(0.88)",
                      opacity: isActive ? 1 : 0.42,
                      filter: isActive ? "grayscale(0%)" : "grayscale(55%)",
                      borderColor: isActive ? "rgb(var(--c-ocean) / 0.55)" : "var(--hair)",
                      boxShadow: isActive
                        ? "0 0 0 1px rgb(var(--c-ocean) / 0.18), 0 20px 44px -18px rgb(var(--c-ocean) / 0.35)"
                        : "none",
                      background: "rgb(var(--c-surface))",
                    }}
                  >
                    <span
                      className="pointer-events-none absolute -top-4 right-1 select-none font-display text-[148px] font-black leading-none"
                      style={{ color: isActive ? "rgb(var(--c-ocean-light))" : "rgb(var(--c-ink))", opacity: isActive ? 0.14 : 0.06 }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <button
                      onClick={(e) => toggleSave(o.id, e)}
                      className="absolute left-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-canvas/60 backdrop-blur transition-colors hover:border-ocean/50"
                      aria-label={isSaved ? "Unsave" : "Save"}
                    >
                      {isSaved ? (
                        <BookmarkCheck size={15} className="text-ocean-light" />
                      ) : (
                        <Bookmark size={15} className="text-slate" />
                      )}
                    </button>

                    <span className="mb-3 inline-block w-fit rounded-full bg-slate/15 px-2.5 py-1 text-[10.5px] font-bold text-slate">
                      {o.category}
                    </span>
                    <p className="mb-2 font-display text-[19px] font-bold leading-tight text-ink">{o.title}</p>
                    <p className="text-[12.5px] leading-relaxed text-ink/75">{o.description}</p>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => goTo(selected + 1)}
              disabled={selected === list.length - 1}
              className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-surface text-ink transition-colors hover:border-ocean/50 hover:text-ocean-light disabled:opacity-30"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {active && (
            <div className="mx-auto mt-5 max-w-2xl rounded-xl2 border border-white/10 bg-surface px-7 py-6">
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="font-display text-lg font-bold text-ink">{active.title}</p>
                <button
                  onClick={(e) => toggleSave(active.id, e)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate hover:border-ocean/50 hover:text-ocean-light"
                >
                  {savedIds.has(active.id) ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                  {savedIds.has(active.id) ? "Saved" : "Save"}
                </button>
              </div>
              {active.whyHere && (
                <p className="mb-4 text-[12.5px] italic text-ocean-light">&ldquo;{active.whyHere}&rdquo;</p>
              )}
              <div className="flex flex-col gap-1.5 text-[12.5px]">
                <p><span className="font-semibold text-slate">Deadline — </span><span className="text-ink/85">{formatDeadline(active.deadline)}</span></p>
                {active.eligibility && (
                  <p><span className="font-semibold text-slate">Eligibility — </span><span className="text-ink/85">{active.eligibility}</span></p>
                )}
                {active.deadlineText && (
                  <p><span className="font-semibold text-slate">As written — </span><span className="italic text-ink/85">&ldquo;{active.deadlineText}&rdquo;</span></p>
                )}
                {active.uncertainty && (
                  <p><span className="font-semibold text-slate">Worth checking — </span><span className="text-ink/85">{active.uncertainty}</span></p>
                )}
              </div>

              {active.sources?.length > 0 && (
                <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate">
                  <MessageSquare size={12} /> {active.sourceCount} source{active.sourceCount > 1 ? "s" : ""} · {active.sources[0].channel}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

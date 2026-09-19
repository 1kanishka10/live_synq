import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import clsx from "clsx";

export function Badge({ tone = "ocean", children, className }) {
  const tones = {
    ocean: "bg-ocean/10 text-ocean",
    critical: "bg-critical/10 text-critical",
    high: "bg-high/10 text-high",
    medium: "bg-medium/10 text-medium",
    slate: "bg-slate/10 text-slate",
  };
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ className, children, ...props }) {
  return (
    <div
      className={clsx("glass rounded-xl2 border border-white/60 shadow-panel", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  // Portalled for the same reason as the import dialog: any ancestor with a
  // backdrop-filter or transform would otherwise capture position:fixed.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl2 bg-surface shadow-panel">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate/10 bg-surface/95 backdrop-blur px-5 py-4">
          <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate hover:bg-canvas" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

/**
 * accent (optional): a CSS color string, e.g. "rgb(var(--c-critical))".
 * Renders a 4px strip along the top of the panel so the drawer visually
 * carries the urgency color of whatever it was opened from.
 */
export function Drawer({ open, onClose, title, accent, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return createPortal(
    <div
      className={clsx(
        "fixed inset-0 z-50 transition-opacity",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          "absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-hidden bg-surface shadow-panel transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {accent && <div className="h-1 w-full shrink-0" style={{ background: accent }} />}
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 flex items-center justify-between border-b border-slate/10 bg-surface/95 backdrop-blur px-5 py-4">
            <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
            <button onClick={onClose} className="rounded-full p-1.5 text-slate hover:bg-canvas" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="px-5 py-5">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

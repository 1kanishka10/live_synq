import React, { useEffect } from "react";
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
  return (
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
    </div>
  );
}

export function Drawer({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={clsx(
        "fixed inset-0 z-50 transition-opacity",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          "absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-surface shadow-panel transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate/10 bg-surface/95 backdrop-blur px-5 py-4">
          <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate hover:bg-canvas" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

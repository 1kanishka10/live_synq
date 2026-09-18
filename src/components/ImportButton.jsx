import React, { useRef, useState } from "react";
import { Upload, X, FileText, CheckCircle2, Info } from "lucide-react";

// Matches both WhatsApp export styles:
//   15/09/2026, 20:43 - Sender: text
//   [15/09/2026, 20:43:12] Sender: text
const LINE =
  /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?\]?\s*-?\s*([^:]{1,60}?):\s?(.*)$/i;

function readExport(text) {
  const lines = text.split(/\r?\n/);
  const senders = new Set();
  let messages = 0;

  for (const line of lines) {
    const m = line.match(LINE);
    if (m) {
      messages += 1;
      senders.add(m[2].trim());
    }
  }
  return { messages, senders: senders.size, lines: lines.length };
}

export function ImportButton() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    setError(null);
    setStats(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = readExport(String(reader.result || ""));
      if (result.messages === 0) {
        setError(
          "No WhatsApp-formatted messages were found in that file. Export the chat without media and try the .txt file."
        );
      } else {
        setStats(result);
      }
    };
    reader.onerror = () => setError("That file could not be read.");
    reader.readAsText(f);
  }

  function close() {
    setOpen(false);
    setFile(null);
    setStats(null);
    setError(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-ocean px-3.5 py-2 text-xs font-semibold text-white"
      >
        <Upload size={14} />
        Import chat
      </button>

      {open && (
        <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-[#050B1E]/70 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
                        className="bg-surface max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl2 border border-white/60 p-6 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">Import your chats</h2>
                <p className="mt-1 text-sm text-slate">
                  Synq reads a WhatsApp export. Nothing is uploaded anywhere.
                </p>
              </div>
              <button
                onClick={close}
                className="shrink-0 rounded-full p-1.5 text-slate hover:bg-slate/10"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <ol className="mb-5 flex flex-col gap-3">
              {[
                "Open the group in WhatsApp and tap ⋮ → More → Export chat.",
                "Choose Without media. You'll get a .txt file.",
                "Drop that file below. Synq extracts, threads and ranks it.",
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ocean text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-ink/80">{step}</span>
                </li>
              ))}
            </ol>

            <input
              ref={inputRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            <button
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-slate/40 px-4 py-7 text-center hover:border-ocean"
            >
              <FileText size={22} className="text-slate" />
              <span className="text-sm font-medium text-ink">
                {file ? file.name : "Choose a chat export, or drop it here"}
              </span>
              <span className="text-xs text-slate">.txt from WhatsApp</span>
            </button>

            {error && (
              <p className="mt-4 rounded-lg border border-critical/30 bg-critical/5 p-3 text-xs leading-relaxed text-ink/80">
                {error}
              </p>
            )}

            {stats && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-medium/30 bg-medium/5 p-3">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-medium" />
                <p className="text-xs leading-relaxed text-ink/80">
                  Read <strong className="text-ink">{stats.messages} messages</strong> from{" "}
                  <strong className="text-ink">{stats.senders} senders</strong> in {file?.name}.
                </p>
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate/25 p-3">
              <Info size={15} className="mt-0.5 shrink-0 text-slate" />
              <p className="text-xs leading-relaxed text-slate">
                This prototype runs on a pre-processed set of 50 real messages so the demo
                can't fail on a network call. Extraction of a newly imported file is not
                wired up yet — everything you see below was produced by the same pipeline.
              </p>
            </div>

            <button
              onClick={close}
              className="mt-5 w-full rounded-full bg-ocean px-5 py-2.5 text-sm font-semibold text-white"
            >
              Show me what it found
            </button>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useRef, useState } from "react";
import { Upload, X, FileText, CheckCircle2, Info, Loader2, AlertTriangle } from "lucide-react";
import { useData } from "../data/DataContext";
import { adapt } from "../../lib/adapt";

// One WhatsApp export line. Indian exports are dd/mm/yyyy.
const HEAD =
  /^\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?m\.?)?\]?\s*[-–]?\s*([^:]{1,60}?):\s?([\s\S]*)$/i;

// Lines WhatsApp inserts itself, which cost an API call and tell us nothing.
const SYSTEM =
  /end-to-end encrypted|<Media omitted>|created group|added you|changed the subject|joined using this group's invite link|deleted this message|security code changed/i;

const CHUNK = 6;      // must stay at or under the endpoint's MAX_CHUNK
const MAX_MESSAGES = 200;

const DEFAULT_PROFILE = {
  name: "First year",
  year: 1,
  branch: "CS-AI",
  section: "A",
  hostel: false,
  societies: [],
};

const pad = (n) => String(n).padStart(2, "0");

function toISO(d, m, y, hh, mm, ss, ampm) {
  let year = Number(y);
  if (year < 100) year += 2000;
  let hour = Number(hh);
  const mer = (ampm || "").toLowerCase().replace(/\./g, "");
  if (mer === "pm" && hour < 12) hour += 12;
  if (mer === "am" && hour === 12) hour = 0;
  return `${year}-${pad(m)}-${pad(d)}T${pad(hour)}:${pad(mm)}:${pad(ss || 0)}+05:30`;
}

// Returns real message objects, not just a count. A message body can run over
// several lines, so any line that isn't a new header belongs to the last one.
function readExport(text) {
  const out = [];
  const senders = new Set();
  let n = 0;

  for (const line of text.split(/\r?\n/)) {
    const m = line.match(HEAD);
    if (m) {
      const [, dd, mo, yy, hh, mi, ss, mer, sender, body] = m;
      if (SYSTEM.test(body) || SYSTEM.test(sender)) continue;
      n += 1;
      senders.add(sender.trim());
      out.push({
        id: `msg_${String(n).padStart(3, "0")}`,
        text: body,
        sender: sender.trim(),
        channel: "Imported chat",
        sent_at: toISO(dd, mo, yy, hh, mi, ss, mer),
      });
    } else if (out.length && line.trim()) {
      out[out.length - 1].text += "\n" + line;
    }
  }

  return { messages: out, senders: senders.size };
}

export function ImportButton() {
  const { replaceAll } = useData();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | extracting | finalizing | done
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [skipped, setSkipped] = useState(0);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    setError(null);
    setParsed(null);
    setSummary(null);
    setPhase("idle");

    const reader = new FileReader();
    reader.onload = () => {
      const result = readExport(String(reader.result || ""));
      if (result.messages.length === 0) {
        setError(
          "No WhatsApp-formatted messages were found in that file. Export the chat without media and try the .txt file."
        );
      } else {
        setParsed(result);
      }
    };
    reader.onerror = () => setError("That file could not be read.");
    reader.readAsText(f);
  }

  async function run() {
    if (!parsed) return;

    const messages = parsed.messages.slice(0, MAX_MESSAGES);
    const today = new Date().toISOString();

    setError(null);
    setPhase("extracting");
    setProgress({ done: 0, total: messages.length });
    setSkipped(0);

    try {
      // Stage 1, in chunks — each call stays well inside the function timeout,
      // and every returned chunk moves the counter.
      const records = [];
      let failedCount = 0;

      for (let i = 0; i < messages.length; i += CHUNK) {
        const slice = messages.slice(i, i + CHUNK);
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: slice, today }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Extraction failed (${res.status})`);
        }

        const { records: got, failed } = await res.json();
        records.push(...got);
        failedCount += failed?.length ?? 0;
        setProgress({ done: Math.min(i + CHUNK, messages.length), total: messages.length });
        setSkipped(failedCount);
      }

      if (records.length === 0) {
        throw new Error("Nothing could be extracted from that file.");
      }

      // Stage 2 and 3 in one call, so threading sees every message at once.
      setPhase("finalizing");
      const res2 = await fetch("/api/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records,
          profile: DEFAULT_PROFILE,
          messagesIn: messages.length,
        }),
      });

      if (!res2.ok) {
        const body = await res2.json().catch(() => ({}));
        throw new Error(body.error || `Processing failed (${res2.status})`);
      }

      const payload = await res2.json();
      const next = adapt(payload);

      replaceAll({ ...next, societies: undefined });
      setSummary({
        messages: messages.length,
        kept: payload.stats?.items_total ?? next.announcements.length,
        noise: payload.stats?.noise_dropped ?? 0,
        now: next.deadlines.length,
      });
      setPhase("done");
    } catch (e) {
      setError(e.message || "Something went wrong while processing.");
      setPhase("idle");
    }
  }

  function close() {
    setOpen(false);
    setFile(null);
    setParsed(null);
    setSummary(null);
    setError(null);
    setPhase("idle");
  }

  const busy = phase === "extracting" || phase === "finalizing";

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
          onClick={busy ? undefined : close}
        >
          <div
            className="bg-surface max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl2 border border-white/60 p-6 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">Import your chats</h2>
                <p className="mt-1 text-sm text-slate">
                  Synq reads a WhatsApp export and processes it live.
                </p>
              </div>
              <button
                onClick={close}
                disabled={busy}
                className="shrink-0 rounded-full p-1.5 text-slate hover:bg-slate/10 disabled:opacity-40"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {phase !== "done" && (
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
            )}

            <input
              ref={inputRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {phase !== "done" && (
              <button
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!busy) handleFile(e.dataTransfer.files?.[0]);
                }}
                className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-slate/40 px-4 py-7 text-center hover:border-ocean disabled:opacity-50"
              >
                <FileText size={22} className="text-slate" />
                <span className="text-sm font-medium text-ink">
                  {file ? file.name : "Choose a chat export, or drop it here"}
                </span>
                <span className="text-xs text-slate">.txt from WhatsApp</span>
              </button>
            )}

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-critical/30 bg-critical/5 p-3">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-critical" />
                <p className="text-xs leading-relaxed text-ink/80">{error}</p>
              </div>
            )}

            {parsed && phase === "idle" && !error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-medium/30 bg-medium/5 p-3">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-medium" />
                <p className="text-xs leading-relaxed text-ink/80">
                  Read <strong className="text-ink">{parsed.messages.length} messages</strong>{" "}
                  from <strong className="text-ink">{parsed.senders} senders</strong>.
                  {parsed.messages.length > MAX_MESSAGES &&
                    ` Only the first ${MAX_MESSAGES} will be processed.`}
                </p>
              </div>
            )}

            {busy && (
              <div className="mt-4 rounded-lg border border-ocean/30 bg-ocean/5 p-3.5">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink">
                  <Loader2 size={14} className="animate-spin text-ocean" />
                  {phase === "extracting"
                    ? `Reading message ${progress.done} of ${progress.total}`
                    : "Grouping duplicates and ranking…"}
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate/20">
                  <div
                    className="h-full rounded-full bg-ocean transition-all duration-300"
                    style={{
                      width:
                        phase === "finalizing"
                          ? "100%"
                          : `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%`,
                    }}
                  />
                </div>
                {skipped > 0 && (
                  <p className="mt-2 text-[11px] text-slate">
                    {skipped} message{skipped === 1 ? "" : "s"} could not be read and were
                    skipped.
                  </p>
                )}
              </div>
            )}

            {phase === "done" && summary && (
              <div className="rounded-xl border border-medium/30 bg-medium/5 p-4">
                <p className="font-display text-sm font-bold text-ink">
                  {summary.messages} messages in. {summary.now} things you actually have to do.
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink/75">
                  {summary.kept} real items kept, {summary.noise} set aside as noise
                  {skipped > 0 ? `, ${skipped} unreadable` : ""}. Every screen below is now
                  showing your chat.
                </p>
              </div>
            )}

            {phase !== "done" && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate/25 p-3">
                <Info size={15} className="mt-0.5 shrink-0 text-slate" />
                <p className="text-xs leading-relaxed text-slate">
                  Your messages are sent to Synq's own endpoint and on to the extraction
                  model. They are processed in memory and not saved. The app ships with a
                  sample corpus so it works before you import anything.
                </p>
              </div>
            )}

            {phase === "done" ? (
              <button
                onClick={close}
                className="mt-5 w-full rounded-full bg-ocean px-5 py-2.5 text-sm font-semibold text-white"
              >
                Show me what it found
              </button>
            ) : (
              <button
                onClick={run}
                disabled={!parsed || busy}
                className="mt-5 w-full rounded-full bg-ocean px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? "Processing…" : "Process this chat"}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

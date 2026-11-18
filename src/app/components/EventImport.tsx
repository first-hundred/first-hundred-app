import { useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Loader2, X } from "lucide-react";
import { useWorkspace } from "../lib/store";
import { api } from "../lib/api";
import type { Prospect } from "../lib/types";

const STEPS = ["Opening the event page…", "Finding hosts, judges and sponsors…", "Ranking who to talk to first…", "Almost there…"];

export function EventImport({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: (eventName: string) => void }) {
  const { ws, set } = useWorkspace();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  if (!open || !ws.profile) return null;

  const go = async () => {
    setBusy(true); setError(""); setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2200);
    try {
      const { event, prospects } = await api.event(url, ws.profile!);
      if (!prospects.length) throw new Error("No named people found on that page.");
      const existing = new Map(ws.prospects.map((p) => [p.id, p]));
      const incoming: Prospect[] = prospects.map((p) => {
        const ex = existing.get(p.id);
        return { ...p, stage: ex?.stage ?? "new", draft: ex?.draft, contactedAt: ex?.contactedAt, film: ex?.film };
      });
      const ids = new Set(incoming.map((p) => p.id));
      set({ prospects: [...incoming, ...ws.prospects.filter((p) => !ids.has(p.id))].sort((a, b) => b.score - a.score) });
      onDone?.(event.name);
      onClose();
      setUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      clearInterval(t); setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => !busy && onClose()}>
      <div className="card fade-in w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-stock p-2 text-ink"><CalendarDays className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-bold">Find them at an event</h2>
              <p className="text-sm text-grain">Paste a Luma (or any) event link. Every host, judge and sponsor becomes a prospect.</p>
            </div>
          </div>
          <button className="btn-ghost px-2" onClick={onClose} disabled={busy}><X className="h-4 w-4" /></button>
        </div>
        <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (url.trim()) go(); }}>
          <input className="input h-11" placeholder="https://luma.com/your-event" value={url} onChange={(e) => setUrl(e.target.value)} disabled={busy} autoFocus />
          <button className="btn-primary h-11" disabled={busy || !url.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add people"}</button>
        </form>
        {busy && <p className="fade-in mt-3 text-sm font-medium" key={step}>{STEPS[step]}</p>}
        {error && <p className="mt-3 border-l-[3px] border-ink pl-2 text-sm">! {error}</p>}
      </div>
    </div>,
    document.body,
  );
}

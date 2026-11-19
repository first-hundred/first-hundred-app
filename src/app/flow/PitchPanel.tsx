import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import type { Interview } from "@/lib/interview";
import { useWorkspace } from "../lib/store";

export function PitchPill() {
  const [open, setOpen] = useState(false);
  const { ws } = useWorkspace();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!ws.interview) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-28 left-4 z-40 sm:bottom-4 rounded-full bg-white/60 px-3 py-1.5 text-xs text-ink backdrop-blur hover:bg-white/80"
      >
        Your pitch
      </button>
      {open && <Sheet onClose={() => setOpen(false)} />}
    </>
  );
}

function Sheet({ onClose }: { onClose: () => void }) {
  const { ws, set } = useWorkspace();
  const i = ws.interview;
  if (!i) return null;

  const update = (patch: Partial<Interview>) => {
    const n = { ...i, ...patch };
    const profile = ws.profile
      ? {
          ...ws.profile,
          pitch: {
            ...(ws.profile.pitch ?? { offer: "", points: [], proof: [], cta_line: "", contact: "" }),
            offer: n.pitch,
            points: n.points.filter(Boolean),
            proof: n.proof.filter((p) => p.value || p.label),
            cta_line: n.ask,
            contact: n.contact,
          },
        }
      : undefined;
    set(profile ? { interview: n, profile } : { interview: n });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white/60 p-6 text-ink backdrop-blur" onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-4 top-4 text-ink/60 hover:text-ink"><X className="h-5 w-5" /></button>
        <div className="space-y-6">
          <Field label="Pitch">
            <textarea className="h-24 w-full resize-none border-b border-rule bg-transparent text-base leading-snug text-ink outline-none focus:border-ink" value={i.pitch} onChange={(e) => update({ pitch: e.target.value })} />
          </Field>
          <Field label="Buyer role"><Line value={i.buyer.role} onChange={(v) => update({ buyer: { ...i.buyer, role: v } })} /></Field>
          <Field label="Company type"><Line value={i.buyer.companyType} onChange={(v) => update({ buyer: { ...i.buyer, companyType: v } })} /></Field>
          <Field label="Size"><Line value={i.buyer.size} onChange={(v) => update({ buyer: { ...i.buyer, size: v } })} /></Field>
          <Field label="Points">
            <div className="space-y-2">
              {i.points.map((p, n) => (
                <div key={n} className="flex items-center gap-2">
                  <Line value={p} onChange={(v) => update({ points: i.points.map((x, m) => (m === n ? v : x)) })} />
                  <button type="button" aria-label="Remove point" onClick={() => update({ points: i.points.filter((_, m) => m !== n) })}><X className="h-4 w-4" /></button>
                </div>
              ))}
              <button type="button" className="flex items-center gap-1 text-sm" onClick={() => update({ points: [...i.points, ""] })}><Plus className="h-4 w-4" /> Add</button>
            </div>
          </Field>
          <Field label="Proof">
            <div className="space-y-2">
              {i.proof.map((p, n) => (
                <div key={n} className="flex items-center gap-2">
                  <input className="h-10 w-20 shrink-0 border-b border-rule bg-transparent text-base outline-none focus:border-ink" value={p.value} placeholder="12" onChange={(e) => update({ proof: i.proof.map((x, m) => (m === n ? { ...x, value: e.target.value } : x)) })} />
                  <Line value={p.label} onChange={(v) => update({ proof: i.proof.map((x, m) => (m === n ? { ...x, label: v } : x)) })} />
                  <button type="button" aria-label="Remove proof" onClick={() => update({ proof: i.proof.filter((_, m) => m !== n) })}><X className="h-4 w-4" /></button>
                </div>
              ))}
              <button type="button" className="flex items-center gap-1 text-sm" onClick={() => update({ proof: [...i.proof, { value: "", label: "" }] })}><Plus className="h-4 w-4" /> Add</button>
            </div>
          </Field>
          <Field label="Ask"><Line value={i.ask} onChange={(v) => update({ ask: v })} /></Field>
          <Field label="How to reach you"><Line value={i.contact} onChange={(v) => update({ contact: v })} /></Field>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><span className="label text-sm">{label}</span><div className="mt-1">{children}</div></div>;
}

function Line({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input className="h-10 w-full min-w-0 border-b border-rule bg-transparent text-base text-ink outline-none focus:border-ink" value={value} onChange={(e) => onChange(e.target.value)} />;
}

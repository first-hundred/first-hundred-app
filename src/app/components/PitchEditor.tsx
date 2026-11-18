import { Plus, X } from "lucide-react";
import { useWorkspace } from "../lib/store";
import type { Pitch } from "../lib/types";

/** The founder's pitch, as coldopen's sales profile: what every film says after it talks about them. */
export function PitchEditor() {
  const { ws, set } = useWorkspace();
  const p = ws.profile!;
  const pitch: Pitch = p.pitch ?? { offer: p.product_one_liner, points: [], proof: [], cta_line: "Worth a 15-minute look?", contact: "" };
  const update = (patch: Partial<Pitch>) => set({ profile: { ...p, pitch: { ...pitch, ...patch } } });
  const ok = pitch.points.filter((x) => x.trim()).length >= 2 && pitch.proof.some((x) => x.value.trim() && x.label.trim()) && (pitch.contact.trim() || pitch.book?.trim());

  return (
    <div className="overflow-hidden rounded-lg border border-ink bg-white">
      <div className="flex items-center justify-between border-b border-rule px-5 py-3">
        <div>
          <div className="font-semibold">Your pitch, for the films</div>
          <p className="text-xs text-grain">Every film opens on their company, then says this. coldopen shows your proof word for word, so only use real numbers.</p>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${ok ? "bg-stock text-ink" : "bg-screen text-grain"}`}>{ok ? "Ready to film" : "Needs proof + contact"}</span>
      </div>
      <div className="grid gap-5 p-5 md:grid-cols-2">
        <div className="space-y-4">
          <label className="block"><span className="label">What you offer, in their terms</span>
            <input className="input mt-1" maxLength={120} value={pitch.offer} onChange={(e) => update({ offer: e.target.value })} /></label>
          <div>
            <span className="label">Points (2 to 6)</span>
            {pitch.points.map((pt, i) => (
              <div key={i} className="mt-1 flex gap-1">
                <input className="input" maxLength={120} value={pt} onChange={(e) => update({ points: pitch.points.map((x, j) => (j === i ? e.target.value : x)) })} />
                <button className="btn-ghost px-2" onClick={() => update({ points: pitch.points.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></button>
              </div>
            ))}
            {pitch.points.length < 6 && <button className="btn-ghost mt-1 px-2 text-xs" onClick={() => update({ points: [...pitch.points, ""] })}><Plus className="h-3.5 w-3.5" /> Add point</button>}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <span className="label">Proof (1 to 3 real numbers)</span>
            {pitch.proof.map((pr, i) => (
              <div key={i} className="mt-1 flex gap-1">
                <input className="input w-24 font-display text-lg font-bold" placeholder="140" maxLength={12} value={pr.value} onChange={(e) => update({ proof: pitch.proof.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
                <input className="input" placeholder="teams use it weekly" maxLength={60} value={pr.label} onChange={(e) => update({ proof: pitch.proof.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                <button className="btn-ghost px-2" onClick={() => update({ proof: pitch.proof.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></button>
              </div>
            ))}
            {pitch.proof.length < 3 && <button className="btn-ghost mt-1 px-2 text-xs" onClick={() => update({ proof: [...pitch.proof, { value: "", label: "" }] })}><Plus className="h-3.5 w-3.5" /> Add proof</button>}
          </div>
          <label className="block"><span className="label">The ask</span>
            <input className="input mt-1" maxLength={60} value={pitch.cta_line} onChange={(e) => update({ cta_line: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="label">Your email</span>
              <input className="input mt-1" placeholder="you@startup.com" value={pitch.contact} onChange={(e) => update({ contact: e.target.value })} /></label>
            <label className="block"><span className="label">Booking link (optional)</span>
              <input className="input mt-1" placeholder="https://cal.com/you" value={pitch.book ?? ""} onChange={(e) => update({ book: e.target.value })} /></label>
          </div>
        </div>
      </div>
    </div>
  );
}

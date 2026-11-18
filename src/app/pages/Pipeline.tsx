import { useState } from "react";
import { Navigate } from "@/app/lib/router-compat";
import { useWorkspace } from "../lib/store";
import { STAGES, type Prospect, type Stage } from "../lib/types";
import { stageLabel } from "../lib/goal";
import { Avatar, IntentBadge } from "../components/IntentBadge";
import { ProspectDrawer } from "../components/ProspectDrawer";
import { RoadTo100 } from "../components/RoadTo100";

export default function Pipeline() {
  const { ws, setStage } = useWorkspace();
  const [open, setOpen] = useState<Prospect | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  if (!ws.profile) return <Navigate to="/" />;

  return (
    <div className="fade-in space-y-5">
      <div>
        <h1 className="display text-5xl uppercase">Pipeline</h1>
        <p className="mt-1 text-grain">Drag people forward as conversations move. Every win moves the bar.</p>
      </div>
      <RoadTo100 />
      <div className="grid grid-cols-5 gap-3">
        {STAGES.map((s) => {
          const items = ws.prospects.filter((p) => p.stage === s).sort((a, b) => b.score - a.score);
          const shown = s === "new" ? items.slice(0, 25) : items;
          return (
            <div key={s}
              onDragOver={(e) => { e.preventDefault(); setOver(s); }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setStage(e.dataTransfer.getData("text/plain"), s); setOver(null); }}
              className={`min-h-[420px] rounded-lg p-2 transition ${over === s ? "bg-stock/40" : s === "customer" ? "bg-stock" : "bg-black/5"}`}>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-sm font-bold">{stageLabel(s, ws.profile?.goal)}</span>
                <span className="rounded-full bg-white px-2 text-xs font-semibold tabular-nums text-grain">{items.length}</span>
              </div>
              <div className="space-y-2">
                {shown.map((p) => (
                  <div key={p.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)} onClick={() => setOpen(p)}
                    className="cursor-grab rounded-md bg-white p-3 shadow-sm ring-1 ring-rule transition hover:ring-ink active:cursor-grabbing">
                    <div className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2"><Avatar name={p.author} src={p.avatar} size={22} /><span className="truncate text-sm font-semibold">{p.author}</span></span><IntentBadge score={p.score} /></div>
                    <p className="mt-1 line-clamp-2 text-xs text-grain">{p.excerpt}</p>
                  </div>
                ))}
                {s === "new" && items.length > shown.length && <p className="px-2 text-xs text-grain">+{items.length - shown.length} more in Prospects</p>}
              </div>
            </div>
          );
        })}
      </div>
      <ProspectDrawer prospect={open} onClose={() => setOpen(null)} />
    </div>
  );
}

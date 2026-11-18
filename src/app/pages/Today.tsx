import { useState } from "react";
import { Navigate } from "@/app/lib/router-compat";
import { CheckCircle2, Clapperboard, Loader2, Sparkles } from "lucide-react";
import { useWorkspace } from "../lib/store";
import { api } from "../lib/api";
import type { Prospect } from "../lib/types";
import { Avatar, IntentBadge, SourcePill, timeAgo } from "../components/IntentBadge";
import { ProspectDrawer } from "../components/ProspectDrawer";
import { RoadTo100 } from "../components/RoadTo100";
import { signalsFor } from "../lib/network";

export default function Today() {
  const { ws, updateProspect, startFilm } = useWorkspace();
  const [open, setOpen] = useState<Prospect | null>(null);
  const [busy, setBusy] = useState(false);
  if (!ws.profile) return <Navigate to="/" />;

  const ten = ws.prospects.filter((p) => p.stage === "new").sort((a, b) => (signalsFor(b, ws.connections).length - signalsFor(a, ws.connections).length) || b.score - a.score).slice(0, 10);
  const sentToday = ws.prospects.filter((p) => p.contactedAt && new Date(p.contactedAt).toDateString() === new Date().toDateString()).length;

  const draftAll = async () => {
    setBusy(true);
    const todo = ten.filter((p) => !p.draft);
    for (let i = 0; i < todo.length; i += 3) {
      await Promise.allSettled(todo.slice(i, i + 3).map(async (p) => updateProspect(p.id, { draft: await api.draft(ws.profile!, p, "helpful") })));
    }
    setBusy(false);
  };

  return (
    <div className="fade-in space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl uppercase">Today's 10</h1>
          <p className="mt-1 text-grain">The people with the most signals stacked up, warm paths first. {sentToday > 0 && <span className="font-semibold text-ink">{sentToday} sent today.</span>}</p>
        </div>
        <div className="flex gap-2">
        <button className="btn-ink" disabled={!ten.some((p) => p.company_url && !p.film)} onClick={() => ten.filter((p) => p.company_url && !p.film).forEach((p) => startFilm(p.id))}>
          <Clapperboard className="h-4 w-4" /> Make {ten.filter((p) => p.company_url && !p.film).length} films
        </button>
        <button className="btn-primary" onClick={draftAll} disabled={busy || !ten.some((p) => !p.draft)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Write all {ten.length} messages
        </button>
        </div>
      </div>

      <RoadTo100 />

      {!ten.length && <div className="card p-10 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-ink" /><p className="mt-2 font-semibold">Everyone's been contacted. Find more people from your customer profile.</p></div>}

      <div className="grid gap-4 md:grid-cols-2">
        {ten.map((p, i) => (
          <button key={p.id} onClick={() => setOpen(p)} className="card fade-in p-5 text-left transition hover:border-ink" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex items-center gap-2"><span className="text-sm font-bold text-grain">#{i + 1}</span><IntentBadge score={p.score} /><SourcePill source={p.source} community={p.community} role={p.role} />{p.source !== "event" && <span className="text-xs text-grain">{timeAgo(p.date)}</span>}</div>
            <div className="mt-3 flex items-center gap-2"><Avatar name={p.author} src={p.avatar} size={28} /><span className="font-semibold">{p.author}</span></div>
            <p className="mt-1 line-clamp-2 text-sm text-grain">{p.source === "event" ? p.excerpt : `“${p.excerpt}”`}</p>
            {p.why_now && <p className="mt-1 text-xs font-medium text-ink">{p.why_now}</p>}
            {p.film?.status === "succeeded" && p.film.poster ? (
              <div className="filmstrip mt-3 rounded"><img src={p.film.poster} alt="" className="aspect-video w-full rounded-sm object-cover" /></div>
            ) : p.film && p.film.status !== "failed" ? (
              <div className="mt-3 flex items-center gap-2 rounded bg-ink px-3 py-2 text-xs text-white"><span className="rec-dot h-2 w-2 rounded-full bg-tally" /> {p.film.label || "Rolling"}</div>
            ) : null}
            {p.draft ? (
              <p className="mt-3 line-clamp-3 rounded-md bg-screen p-3 text-sm text-ink">{p.draft.message}</p>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-rule p-3 text-sm text-grain">Message not written yet</p>
            )}
          </button>
        ))}
      </div>
      <ProspectDrawer prospect={open} onClose={() => setOpen(null)} />
    </div>
  );
}

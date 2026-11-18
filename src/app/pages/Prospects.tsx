import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "@/app/lib/router-compat";
import { ArrowRight, CalendarDays, Search } from "lucide-react";
import { EventImport } from "../components/EventImport";
import { GOALS, goalOf, stageLabel } from "../lib/goal";
import { useWorkspace } from "../lib/store";
import type { Prospect } from "../lib/types";
import { Avatar, IntentBadge, SourcePill, timeAgo } from "../components/IntentBadge";
import { signalsFor } from "../lib/network";
import { ProspectDrawer } from "../components/ProspectDrawer";

export default function Prospects() {
  const { ws } = useWorkspace();
  const nav = useNavigate();
  const [open, setOpen] = useState<Prospect | null>(null);
  const [params] = useSearchParams();
  const [source, setSource] = useState<"all" | "hackernews" | "reddit" | "event" | "network">((params.get("source") as "event") ?? "all");
  const [eventOpen, setEventOpen] = useState(false);
  const [min, setMin] = useState(0);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"signals" | "score" | "date">("signals");

  const rows = useMemo(() => ws.prospects
    .filter((p) => source === "all" || p.source === source)
    .filter((p) => p.score >= min)
    .filter((p) => !q || `${p.author} ${p.excerpt} ${p.community}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === "signals" ? (signalsFor(b, ws.connections).length - signalsFor(a, ws.connections).length) || b.score - a.score : sort === "score" ? b.score - a.score : +new Date(b.date) - +new Date(a.date)), [ws.prospects, ws.connections, source, min, q, sort]);

  if (!ws.profile) return <Navigate to="/" />;
  const g = GOALS[goalOf(ws.profile.goal)];
  const counts = { event: ws.prospects.filter((p) => p.source === "event").length, online: ws.prospects.filter((p) => p.source !== "event").length };
  if (!ws.prospects.length) return (
    <div className="card p-10 text-center">
      <h2 className="text-xl font-bold">No prospects yet</h2>
      <p className="mt-1 text-grain">Search online from your profile, or pull everyone from an event you're going to.</p>
      <div className="mt-5 flex justify-center gap-2">
        <button className="btn-outline" onClick={() => setEventOpen(true)}><CalendarDays className="h-4 w-4" /> From an event</button>
        <button className="btn-primary" onClick={() => nav("/profile")}>Search online <ArrowRight className="h-4 w-4" /></button>
      </div>
      <EventImport open={eventOpen} onClose={() => setEventOpen(false)} onDone={() => setSource("event")} />
    </div>
  );

  const seg = (active: boolean) => `rounded-md px-2.5 py-1 text-sm font-medium ${active ? "bg-white shadow-sm text-ink" : "text-grain"}`;

  return (
    <div className="fade-in space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl uppercase">{ws.prospects.length} {g.peopleNoun}</h1>
          <p className="mt-1 text-grain">{[counts.online && ws.searchStats ? `${counts.online} ranked from ${ws.searchStats.scanned} real posts on Hacker News and Reddit` : counts.online ? `${counts.online} found online` : "", counts.event ? `${counts.event} from events` : ""].filter(Boolean).join(" · ")}.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={() => setEventOpen(true)}><CalendarDays className="h-4 w-4" /> Add from an event</button>
          <button className="btn-primary" onClick={() => nav("/today")}>Start Today's 10 <ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-black/5 p-1">
          {(["all", "network", "event", "hackernews", "reddit"] as const).map((s) => <button key={s} className={seg(source === s)} onClick={() => setSource(s)}>{{ all: "All", network: "Network", event: "Events", hackernews: "Hacker News", reddit: "Reddit" }[s]}</button>)}
        </div>
        <div className="flex rounded-lg bg-black/5 p-1">
          {[[0, "Any intent"], [50, "Warm+"], [80, "Hot"]].map(([v, l]) => <button key={v} className={seg(min === v)} onClick={() => setMin(v as number)}>{l}</button>)}
        </div>
        <div className="flex rounded-lg bg-black/5 p-1">
          <button className={seg(sort === "signals")} onClick={() => setSort("signals")}>Signals</button>
          <button className={seg(sort === "score")} onClick={() => setSort("score")}>Intent</button>
          <button className={seg(sort === "date")} onClick={() => setSort("date")}>Newest</button>
        </div>
        <div className="relative ml-auto w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-grain" />
          <input className="input pl-9" placeholder="Search people and posts" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="card divide-y divide-rule overflow-hidden">
        {rows.map((p) => (
          <button key={p.id} onClick={() => setOpen(p)} className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-stock/10">
            <Avatar name={p.author} src={p.avatar} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{p.author}</span>
                <IntentBadge score={p.score} />
                <SourcePill source={p.source} community={p.community} role={p.role} />
                {p.source !== "event" && <span className="text-xs text-grain">{timeAgo(p.date)}</span>}
                {p.film?.status === "succeeded" ? <span className="rounded bg-stock px-1.5 py-0.5 text-xs font-semibold text-ink">Film ready</span> : p.film && p.film.status !== "failed" ? <span className="inline-flex items-center gap-1 rounded bg-ink px-1.5 py-0.5 text-xs font-semibold text-white"><span className="rec-dot h-1.5 w-1.5 rounded-full bg-tally" />Rolling</span> : null}
                {p.stage !== "new" && <span className="rounded border border-ink px-1.5 py-0.5 text-xs font-semibold">{stageLabel(p.stage, ws.profile?.goal)}</span>}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-grain">{p.excerpt}</p>
              <div className="mt-1 flex flex-wrap gap-1">{signalsFor(p, ws.connections).map((s) => <span key={s} className="rounded bg-screen px-1.5 py-0.5 text-[11px] font-semibold text-ink">{s}</span>)}</div>
              {p.reason && <p className="mt-1 text-xs font-medium text-grain">→ {p.reason}{p.why_now ? <span className="text-ink"> · {p.why_now}</span> : null}</p>}
            </div>
          </button>
        ))}
        {!rows.length && <div className="p-8 text-center text-sm text-grain">No prospects match these filters.</div>}
      </div>
      <ProspectDrawer prospect={open} onClose={() => setOpen(null)} />
      <EventImport open={eventOpen} onClose={() => setEventOpen(false)} onDone={() => setSource("event")} />
    </div>
  );
}

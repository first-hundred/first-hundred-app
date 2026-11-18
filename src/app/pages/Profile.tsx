import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "@/app/lib/router-compat";
import { CalendarDays, Loader2, Search, Sparkles } from "lucide-react";
import { EventImport } from "../components/EventImport";
import { GOALS, goalOf } from "../lib/goal";
import { PitchEditor } from "../components/PitchEditor";
import { useWorkspace } from "../lib/store";
import { api } from "../lib/api";
import type { Candidate, CustomerProfile, Prospect, Scored } from "../lib/types";

const BATCH = 60;

function ListField({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea className="input mt-1.5 h-28 leading-relaxed" value={value.join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))} />
    </label>
  );
}

export default function Profile() {
  const { ws, set } = useWorkspace();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [eventOpen, setEventOpen] = useState(false);
  // "?find=1" (from the interview walkthrough) starts the online search right away.
  const [params] = useSearchParams();
  const findRef = useRef<(() => void) | null>(null);
  const autoStarted = useRef(false);
  useEffect(() => {
    if (params.get("find") === "1" && !autoStarted.current) { autoStarted.current = true; setTimeout(() => findRef.current?.(), 0); }
  }, []);
  if (!ws.profile) return <Navigate to="/" />;
  const p = ws.profile;
  const g = GOALS[goalOf(p.goal)];
  const update = (patch: Partial<CustomerProfile>) => set({ profile: { ...p, ...patch } });
  const clean = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);

  const findPeople = async () => {
    setBusy(true); setError("");
    try {
      const keywords = clean(p.pain_keywords);
      setStatus(`Searching Hacker News and Reddit for ${keywords.length} pain phrases…`);
      const { candidates, stats } = await api.search(keywords);
      if (!candidates.length) throw new Error(`No posts found. ${stats.errors.join("; ")} Try broader pain phrases.`);
      setStatus(`Found ${candidates.length} people (${stats.hackernews} HN, ${stats.reddit} Reddit posts). Scoring buying intent…`);

      const batches: Candidate[][] = [];
      for (let i = 0; i < candidates.length; i += BATCH) batches.push(candidates.slice(i, i + BATCH));
      const scored: Scored[] = [];
      let done = 0;
      for (let i = 0; i < batches.length; i += 3) {
        const res = await Promise.allSettled(batches.slice(i, i + 3).map((b) => api.score(p, b)));
        for (const r of res) if (r.status === "fulfilled") scored.push(...r.value.scored);
        done += batches.slice(i, i + 3).reduce((n, b) => n + b.length, 0);
        setStatus(`Scored ${done} / ${candidates.length} posts for buying intent…`);
      }
      const byId = new Map(scored.map((s) => [s.id, s]));
      const existing = new Map(ws.prospects.map((x) => [x.id, x]));
      const prospects: Prospect[] = candidates
        .map((c) => {
          const s = byId.get(c.id);
          const ex = existing.get(c.id);
          return {
            ...c, score: Math.round(s?.score ?? 0), reason: s?.reason ?? "", why_now: s?.why_now ?? "",
            company: s?.company || undefined, company_url: s?.company_url || undefined,
            stage: ex?.stage ?? ("new" as const), draft: ex?.draft, contactedAt: ex?.contactedAt, film: ex?.film,
          };
        })
        .filter((x) => byId.has(x.id))
        .sort((a, b) => b.score - a.score)
        .slice(0, 100);
      const events = ws.prospects.filter((x) => x.source === "event");
      set({ prospects: [...events, ...prospects].sort((a, b) => b.score - a.score), searchStats: { hackernews: stats.hackernews, reddit: stats.reddit, scanned: candidates.length } });
      nav("/prospects");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false); setStatus("");
    }
  };

  findRef.current = findPeople;

  return (
    <div className="fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> {p.goal === "investors" ? "Investor profile" : p.goal === "hires" ? "Hiring profile" : "Customer profile"}</div>
          <input className="display mt-1 w-full bg-transparent text-5xl uppercase outline-none" value={p.company_name} onChange={(e) => update({ company_name: e.target.value })} />
          <input className="mt-1 w-full bg-transparent text-grain outline-none" value={p.product_one_liner} onChange={(e) => update({ product_one_liner: e.target.value })} />
        </div>
        <div className="flex gap-2">
        <button className="btn-outline h-11 px-4" onClick={() => setEventOpen(true)} disabled={busy}><CalendarDays className="h-4 w-4" /> From an event</button>
        <button className="btn-primary h-11 px-5" onClick={findPeople} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} {ws.prospects.length ? "Search online again" : "Find people online"}
        </button>
        </div>
      </div>
      {status && <div className="card fade-in flex items-center gap-3 border-ink p-4 text-sm font-medium" key={status}><span className="rec-dot h-2 w-2 rounded-full bg-tally" /><Loader2 className="h-4 w-4 animate-spin" />{status}</div>}
      {error && <div className="border-l-[3px] border-ink bg-white p-4 text-sm">! {error}</div>}

      <div className="rounded-lg bg-ink p-6 text-white">
        <div className="text-xs font-semibold text-stock">Positioning</div>
        <textarea className="mt-2 w-full resize-none bg-transparent text-xl font-semibold leading-snug outline-none" rows={2} value={p.positioning_line} onChange={(e) => update({ positioning_line: e.target.value })} />
      </div>

      <PitchEditor />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="card space-y-4 p-5">
          <div className="label">{g.who}</div>
          {(["role", "company_type", "company_size"] as const).map((k) => (
            <label key={k} className="block">
              <span className="text-xs text-grain">{p.goal === "investors" ? { role: "investor", company_type: "fund type / thesis", company_size: "check size" }[k] : p.goal === "hires" ? { role: "role", company_type: "where they work now", company_size: "seniority" }[k] : k.replace("_", " ")}</span>
              <input className="input mt-1" value={p.ideal_customer[k]} onChange={(e) => update({ ideal_customer: { ...p.ideal_customer, [k]: e.target.value } })} />
            </label>
          ))}
          <label className="block">
            <span className="text-xs text-grain">your first name (signs messages)</span>
            <input className="input mt-1" placeholder="Ashwin" value={p.sender_name ?? ""} onChange={(e) => update({ sender_name: e.target.value })} />
          </label>
        </div>
        <div className="card space-y-4 p-5">
          <ListField label={g.pains} value={p.top_pains} onChange={(v) => update({ top_pains: v })} />
          <ListField label={g.triggers} value={p.trigger_events} onChange={(v) => update({ trigger_events: v })} />
        </div>
        <div className="card space-y-4 p-5">
          <ListField label={g.keywords} value={p.pain_keywords} onChange={(v) => update({ pain_keywords: v })} />
          <ListField label="Where they hang out" value={p.where_they_hang_out} onChange={(v) => update({ where_they_hang_out: v })} />
        </div>
      </div>
      <EventImport open={eventOpen} onClose={() => setEventOpen(false)} onDone={() => nav("/prospects?source=event")} />
    </div>
  );
}

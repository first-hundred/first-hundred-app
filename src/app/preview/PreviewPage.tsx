import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWorkspace } from "../lib/store";
import { startFilm, filmState, filmExtras } from "@/lib/coldopen.functions";
import { draftEmail, getRecipient } from "@/lib/outreach.functions";
import { signature, toAnswers } from "../lib/answers";
import { Ticker } from "@/components/look/Ticker";
import { Button } from "@/components/ui/button";
import { previewProspects, selectedProspects } from "./selection";
import { buildGmail, withShareLink } from "./mail";

type Result = { started?: boolean; id?: string; status?: string; stage?: string; film?: string; poster?: string; share?: string; checked?: boolean; disabled?: boolean; error?: string; subject?: string; body?: string; to?: { name: string; role: string } | null; extrasLoaded?: boolean; email?: string; emailSource?: string; drafted?: boolean };
const decode = (value: unknown): Result => typeof value === "string" ? JSON.parse(value) : value as Result;
const storageKey = (url: string, pitch: string) => `first-hundred:preview:v2:${encodeURIComponent(url)}:${encodeURIComponent(pitch)}`;

// Films start for at most this many companies per visit; the rest wait for the next run.
const MAX_FILMS = 3;
const parse = (value: unknown) => (typeof value === "string" ? JSON.parse(value) : value) as Record<string, string | undefined>;

export default function PreviewPage() {
  const { ws, set, updateProspect, setStage } = useWorkspace();
  const selected = useMemo(() => selectedProspects(ws.selectedLeads ?? [], ws.prospects), [ws.selectedLeads, ws.prospects]);
  useEffect(() => {
    if (!selected.length || selected.every((p) => ws.prospects.some((x) => x.id === p.id && x.ticked && x.company === p.company && x.reason === p.reason))) return;
    const ids = new Set(selected.map((p) => p.id));
    set({ prospects: [...ws.prospects.filter((p) => !ids.has(p.id)), ...selected] });
  }, [selected, ws.prospects, set]);
  const prospects = previewProspects(ws.selectedLeads ?? [], ws.prospects);
  const leads = prospects.map((p) => ({ company: p.company || p.author, url: p.company_url || p.url, why: p.reason }));
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<string, Result>>({});
  const busy = useRef(new Set<string>());
  const pitch = JSON.stringify(ws.interview ?? ws.profile ?? {});
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      for (const lead of leads) {
        const key = storageKey(lead.url, pitch);
        if (busy.current.has(key)) continue;
        busy.current.add(key);
        try {
          let result: Result = {};
          try { result = JSON.parse(localStorage.getItem(key) || "{}"); } catch { /* empty cache */ }
          const save = (next: Result) => {
            result = next;
            try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage unavailable */ }
            if (!stopped) {
              setResults((old) => ({ ...old, [key]: next }));
              const prospect = prospects.find((p) => p.company_url === lead.url);
              if (prospect && next.id) updateProspect(prospect.id, { film: { id: next.id, status: next.status === "succeeded" || next.status === "failed" || next.status === "cancelled" ? next.status : "running", url: lead.url, startedAt: prospect.film?.startedAt ?? new Date().toISOString(), film: next.film, poster: next.poster, share: next.share } });
            }
          };
          if (!result.started && !result.id && leads.findIndex((l) => l.url === lead.url) >= MAX_FILMS) {
            if (!stopped) setResults((old) => ({ ...old, [key]: { error: `${MAX_FILMS} films per run for now` } }));
            continue;
          }
          if (!result.started && !result.id && (!ws.interview && !ws.profile)) continue;
          if (!result.started && !result.id && !result.disabled && !result.error) {
            save({ ...result, started: true });
            const created = decode(await startFilm({ data: { url: lead.url, company: lead.company, interview: ws.interview, profile: ws.profile ?? undefined, sender: ws.sender } }));
            save({ ...created, started: true });
          }
          if (result.id && !result.disabled && result.status !== "failed" && result.status !== "cancelled" && (result.status !== "succeeded" || !result.film)) {
            const state = decode(await filmState({ data: { id: result.id } }));
            save({ ...result, ...state });
          }
          if (result.id && result.status === "succeeded" && !result.extrasLoaded) {
            const extras = decode(await filmExtras({ data: { id: result.id } }));
            save({ ...result, ...(!extras.error && !extras.disabled ? extras : {}), extrasLoaded: true });
          }
          // Once the film is ready (or can't be made): find who to write to, then write the email from the founder's own answers.
          if (!result.drafted && ((result.id && result.status === "succeeded" && result.extrasLoaded) || result.disabled || result.status === "failed" || result.status === "cancelled")) {
            const picked = ws.selectedLeads?.find((l) => l.url === lead.url);
            const name = result.to?.name || picked?.name || "";
            const rec = parse(await getRecipient({ data: { url: lead.url, ...(name ? { name } : {}), ...(result.to?.role ? { role: result.to.role } : {}) } }));
            const to = rec.error ? (result.to ?? null) : (rec.name || name) ? { name: rec.name || name, role: rec.role || result.to?.role || "" } : (result.to ?? null);
            let mail: { subject?: string; body?: string } = {};
            if (ws.sender?.name) {
              const d = parse(await draftEmail({ data: { sender: ws.sender, answers: toAnswers(ws.interview), profile: (ws.profile as unknown as Record<string, unknown>) ?? null, lead, recipient: to, ...(result.share ? { share: result.share } : {}) } }));
              if (!d.error && d.body) mail = { subject: d.subject, body: d.body };
            }
            save({ ...result, to, email: rec.error ? "" : rec.email || "", emailSource: rec.error ? "" : rec.source || "", ...mail, drafted: true });
          }
          save(result);
        } catch {
          if (!stopped) setResults((old) => ({ ...old, [key]: { ...old[key], started: false, error: "Film unavailable" } }));
        }
        finally { busy.current.delete(key); }
      }
    };
    void tick();
    const timer = setInterval(() => void tick(), 3000);
    return () => { stopped = true; clearInterval(timer); };
  }, [JSON.stringify(leads), pitch]);

  const currentIndex = Math.min(index, Math.max(0, leads.length - 1));
  const lead = leads[currentIndex];
  const result = lead ? results[storageKey(lead.url, pitch)] ?? {} : {};
  const ready = result.status === "succeeded" && result.film;
  const local = lead ? ws.prospects.find((p) => p.company_url === lead.url || p.company === lead.company)?.draft : undefined;
  const subject = result.subject || local?.subject || `A short film for ${lead?.company ?? "you"}`;
  const sig = signature(ws.sender, ws.interview?.website || ws.profile?.company_name || "");
  const fallback = local?.message || `Hi,\n\n${ws.interview?.pitch || ws.profile?.product_one_liner || "I would like to connect."}\n\n${ws.interview?.ask || "Worth a quick conversation?"}${sig ? `\n\n${sig}` : ""}`;
  const to = result.email ?? "";
  const editEmail = (email: string) => {
    if (!lead) return;
    const key = storageKey(lead.url, pitch);
    const next = { ...result, email, emailSource: "you" };
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage unavailable */ }
    setResults((old) => ({ ...old, [key]: next }));
  };
  const body = (result.body || (result.share ? withShareLink(fallback, result.share) : fallback)).replace(/\[First name\]/g, "there");
  return <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16 text-ink">
    {!lead ? <p className="text-center text-sm text-grain">No companies picked yet. <Link to="/leads" className="underline">Choose companies</Link></p> : <>
      <div className={`grid items-center gap-12 ${!result.disabled ? "md:grid-cols-2" : "mx-auto w-full max-w-lg"}`}>
        {!result.disabled && <div>
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-white/30 ring-1 ring-ink/10 backdrop-blur">
            {ready ? <video key={result.film} src={result.film} poster={result.poster} controls playsInline autoPlay muted className="h-full w-full object-cover" /> : <>
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/50 via-transparent to-white/30 [animation-duration:2.4s]" />
              <div className="relative px-8 text-center">
                {result.status === "failed" || result.error ? <p className="text-sm text-grain">{result.error?.endsWith("per run for now") ? `${result.error}. Come back for the rest.` : "Film unavailable"}</p> : <Ticker phase="films" inline />}
              </div>
            </>}
          </div>
        </div>}
        <div className="flex flex-col">
          {result.to ? <p className="text-sm"><span className="font-medium">{result.to.name}</span><span className="text-grain"> · {result.to.role}</span></p> : <p className="text-sm font-medium">{lead.company}</p>}
          <label className="mt-4 block text-sm text-grain">To
            <input type="email" value={to} onChange={(e) => editEmail(e.target.value)} placeholder="their email"
              className="mt-1 h-10 w-full border-0 border-b border-rule bg-transparent text-base text-ink outline-none placeholder:text-grain/70 focus:border-ink" />
          </label>
          {result.emailSource === "guess" && <p className="mt-1 text-xs text-grain">Best guess from the usual pattern at {lead.company}. Check it on their site or LinkedIn before you send.</p>}
          {result.status === "succeeded" && result.extrasLoaded && !result.drafted && <p className="mt-1 text-xs text-grain">Writing your email…</p>}
          <p className="mt-5 text-xl font-medium leading-snug tracking-tight">{subject}</p>
          <div className="mt-5 border-t border-ink/10 pt-5 whitespace-pre-line break-words text-[15px] leading-relaxed text-ink/80">{body}</div>
          <Button asChild variant="primary" className="mt-8 h-12 self-start px-8"><a href={buildGmail(to, subject, body)} target="_blank" rel="noreferrer" onClick={() => { const p = prospects[currentIndex]; if (p) setStage(p.id, "contacted"); }}>Send</a></Button>
        </div>
      </div>
      <div className="mt-12 flex items-center justify-center gap-6 text-sm text-grain">
        <Button variant="bare" size="icon" aria-label="Previous company" disabled={currentIndex === 0} onClick={() => setIndex(currentIndex - 1)} className="disabled:opacity-20">←</Button>
        <span>{currentIndex + 1} of {leads.length}</span>
        <Button variant="bare" size="icon" aria-label="Next company" disabled={currentIndex === leads.length - 1} onClick={() => setIndex(currentIndex + 1)} className="disabled:opacity-20">→</Button>
      </div>
      <div className="mt-6 flex justify-center"><Link to="/pipeline" className="text-sm text-grain underline-offset-4 hover:text-ink hover:underline">Pipeline →</Link></div>
    </>}
  </main>;
}

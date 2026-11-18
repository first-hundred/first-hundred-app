import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, ExternalLink, Loader2, Mic, RefreshCw, Send, X } from "lucide-react";
import { RehearsalPanel } from "../features/rehearsal/RehearsalPanel";
import { FilmPanel } from "./FilmPanel";
import { AskPanel } from "./AskPanel";
import { signalsFor } from "../lib/network";
import { useWorkspace } from "../lib/store";
import { api } from "../lib/api";
import { STAGES, type Prospect } from "../lib/types";
import { stageLabel } from "../lib/goal";
import { Avatar, IntentBadge, SourcePill, timeAgo } from "./IntentBadge";

export function ProspectDrawer({ prospect, onClose }: { prospect: Prospect | null; onClose: () => void }) {
  const { ws, updateProspect, setStage } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [rehearsing, setRehearsing] = useState(false);
  const p = prospect ? ws.prospects.find((x) => x.id === prospect.id) ?? prospect : null;

  const generate = async (variant: "helpful" | "direct" = "helpful") => {
    if (!p || !ws.profile) return;
    setLoading(true); setError("");
    try { updateProspect(p.id, { draft: await api.draft(ws.profile, p, variant) }); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (p && !p.draft) generate(); /* eslint-disable-next-line */ }, [p?.id]);
  useEffect(() => { setCopied(false); setError(""); }, [p?.id]);
  // when their film is ready, rewrite the message around it (once)
  useEffect(() => {
    if (p?.film?.status === "succeeded" && p.film.share && p.draft && !p.draft.message.includes(p.film.share)) generate();
    // eslint-disable-next-line
  }, [p?.film?.status]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !rehearsing) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, rehearsing]);
  if (!p) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <aside className="fade-in flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-rule p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2"><IntentBadge score={p.score} /><SourcePill source={p.source} community={p.community} role={p.role} />{p.source !== "event" && <span className="text-xs text-grain">{timeAgo(p.date)}</span>}</div>
            <div className="mt-3 flex items-center gap-3"><Avatar name={p.author} src={p.avatar} size={44} /><h2 className="text-xl font-bold">{p.author}</h2></div>
            <p className="mt-1 text-sm text-grain">{p.reason}</p>
            {p.why_now && <p className="mt-1 text-sm font-semibold text-ink">Why now: {p.why_now}</p>}
          </div>
          <button onClick={onClose} className="btn-ghost px-2"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <div className="label mb-2">{p.source === "event" ? "Who they are" : "What they said"}</div>
            <blockquote className="rounded-md border-l-[3px] border-ink bg-screen p-4 text-sm leading-relaxed text-grain">{p.source === "event" ? p.excerpt : `“${p.excerpt}”`}</blockquote>
            <a href={p.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium underline-offset-2 hover:underline">{p.source === "event" ? "Open profile" : "Open original"} <ExternalLink className="h-3.5 w-3.5" /></a>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {signalsFor(p, ws.connections).map((s) => <span key={s} className="rounded border border-ink px-1.5 py-0.5 text-xs font-semibold">{s}</span>)}
          </div>

          <AskPanel p={p} />

          <div>
            <div className="label mb-2">Their film</div>
            <FilmPanel p={p} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="label">Your first message</div>
              <div className="flex gap-1">
                <button className="btn-ghost px-2 py-1 text-xs" disabled={loading} onClick={() => generate("helpful")}><RefreshCw className="h-3.5 w-3.5" /> Helpful</button>
                <button className="btn-ghost px-2 py-1 text-xs" disabled={loading} onClick={() => generate("direct")}><RefreshCw className="h-3.5 w-3.5" /> Direct</button>
              </div>
            </div>
            {loading ? (
              <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-rule text-sm text-grain"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Writing a message only {p.author} would get…</div>
            ) : p.draft ? (
              <>
                <input className="input mb-2 font-medium" value={p.draft.subject} onChange={(e) => updateProspect(p.id, { draft: { ...p.draft!, subject: e.target.value } })} />
                <textarea className="input h-48 leading-relaxed" value={p.draft.message} onChange={(e) => updateProspect(p.id, { draft: { ...p.draft!, message: e.target.value } })} />
                <div className="mt-1 text-right text-xs text-grain">{p.draft.message.split(/\s+/).filter(Boolean).length} words</div>
              </>
            ) : null}
            {error && <p className="mt-2 border-l-[3px] border-rule pl-2 text-sm">! {error}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn-outline" disabled={!p.draft} onClick={async () => { await navigator.clipboard.writeText(p.draft!.message); setCopied(true); }}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
            </button>
            <button className="btn-primary" disabled={!p.draft || p.stage !== "new"} onClick={() => { setStage(p.id, "contacted"); window.open(p.url, "_blank"); }}>
              <Send className="h-4 w-4" /> {p.stage === "new" ? "Open & mark sent" : "Sent"}
            </button>
            <button className="btn-outline" onClick={() => setRehearsing(true)}><Mic className="h-4 w-4" /> Rehearse the call</button>
          </div>

          <div>
            <div className="label mb-2">Stage</div>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((s) => (
                <button key={s} onClick={() => setStage(p.id, s)}
                  className={`rounded-md px-3 py-1 text-sm font-medium ring-1 transition ${p.stage === s ? "bg-ink text-white ring-ink" : "text-grain ring-rule hover:ring-ink"}`}>
                  {stageLabel(s, ws.profile?.goal)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
      {rehearsing && ws.profile && (
        <div onClick={(e) => e.stopPropagation()}>
          <RehearsalPanel prospect={p} profile={ws.profile} goal={ws.profile.goal === "investors" ? "investors" : "customers"} onClose={() => setRehearsing(false)} />
        </div>
      )}
    </div>,
    document.body,
  );
}

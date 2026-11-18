import { useState } from "react";
import { Check, Clapperboard, Copy, ExternalLink, Loader2, RotateCcw } from "lucide-react";
import { useWorkspace } from "../lib/store";
import type { Prospect } from "../lib/types";

/** The slate: company, take, running time. Real information, set like a film slate. */
export function Slate({ company, take = 1, seconds, live }: { company: string; take?: number; seconds?: number | null; live?: boolean }) {
  const tc = seconds ? `00:00:${String(Math.round(seconds)).padStart(2, "0")}` : "--:--:--";
  return (
    <div className="grid grid-cols-[1fr_auto_auto] divide-x divide-white/20 bg-ink text-white">
      <div className="px-3 py-2"><div className="text-[10px] text-white/60">Company</div><div className="tc truncate text-lg uppercase">{company}</div></div>
      <div className="px-3 py-2"><div className="text-[10px] text-white/60">Take</div><div className="tc text-lg">{take}</div></div>
      <div className="px-3 py-2">
        <div className="flex items-center gap-1 text-[10px] text-white/60">{live && <span className="rec-dot h-1.5 w-1.5 rounded-full bg-tally" />}Running</div>
        <div className="tc text-lg">{tc}</div>
      </div>
    </div>
  );
}

export function FilmPanel({ p }: { p: Prospect }) {
  const { startFilm, ws } = useWorkspace();
  const [site, setSite] = useState(p.company_url ?? "");
  const [copied, setCopied] = useState<"" | "link" | "gif">("");
  const f = p.film;
  const company = p.company ?? f?.url ?? p.company_url ?? p.author;
  const ready = !!ws.profile?.pitch?.proof?.length && (ws.profile?.pitch?.points?.length ?? 0) >= 2;
  const copy = async (text: string, what: "link" | "gif") => { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 1500); };

  if (!f || f.status === "failed" || f.status === "cancelled") {
    return (
      <div className="overflow-hidden rounded-lg border border-ink">
        <div className="clapper h-3" />
        <div className="space-y-3 bg-white p-4">
          <div className="flex items-start gap-3">
            <Clapperboard className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">Make {p.author.split(" ")[0]} a 30-second film</div>
              <p className="text-sm text-grain">coldopen reads their company's site and makes a film in their own brand, about them, ending with your ask. 57% of coldopen films got a reply.</p>
            </div>
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (site.trim()) startFilm(p.id, site.trim()); }}>
            <input className="input" placeholder="their company's website, e.g. lovable.dev" value={site} onChange={(e) => setSite(e.target.value)} />
            <button className="btn-primary shrink-0" disabled={!site.trim() || !ready}>{f ? <><RotateCcw className="h-4 w-4" /> Try again</> : "Make film"}</button>
          </form>
          {!ready && <p className="text-xs text-grain">Add your pitch (two points and one proof number) on the profile page first.</p>}
          {f?.error && <p className="border-l-[3px] border-rule pl-2 text-sm text-ink">! {f.error}</p>}
          {f?.error && /blocked|403|refuse/i.test(f.error) && (
            <p className="text-sm text-grain">Some homepages turn away automated readers. Try another page of their site, like <button type="button" className="font-semibold text-ink underline underline-offset-2" onClick={() => setSite(`${site.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}/pricing`)}>{site.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}/pricing</button>.</p>
          )}
        </div>
      </div>
    );
  }

  if (f.status !== "succeeded") {
    return (
      <div className="overflow-hidden rounded-lg border border-ink">
        <div className="flex aspect-square max-h-72 w-full flex-col items-center justify-center gap-3 bg-[#17181B] text-white">
          <Loader2 className="h-6 w-6 animate-spin text-stock" />
          <div className="text-center">
            <div className="tc text-2xl uppercase">Rolling</div>
            <div className="mt-1 text-sm text-white/70">{f.label || "In the queue"}</div>
          </div>
          <div className="text-xs text-white/40">Usually about a minute. You can keep working.</div>
        </div>
        <Slate company={company} live />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ink">
      {f.film ? (
        <video key={f.film} className="w-full bg-black" src={f.film} poster={f.poster ?? undefined} controls playsInline />
      ) : f.poster ? <img src={f.poster} alt="" className="w-full" /> : null}
      <Slate company={company} seconds={f.durationSec} />
      <div className="flex flex-wrap gap-2 bg-white p-3">
        {f.share && <button className="btn-outline" onClick={() => copy(f.share!, "link")}>{copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Share link</button>}
        {f.gif && <button className="btn-outline" onClick={() => copy(f.gif!, "gif")}>{copied === "gif" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} GIF for email</button>}
        {f.share && <a className="btn-ghost" href={f.share} target="_blank" rel="noreferrer">Open their page <ExternalLink className="h-3.5 w-3.5" /></a>}
      </div>
    </div>
  );
}

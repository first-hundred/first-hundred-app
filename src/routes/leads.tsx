import { RequireAuthOrDemo } from "@/app/lib/gate";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { suggestLeads } from "@/lib/outreach.functions";
import { getEventLeads } from "@/lib/leads.functions";
import { z } from "zod";
import { useWorkspace } from "@/app/lib/store";
import { useDemoSeed } from "@/app/lib/useDemoSeed";
import { DemoNote } from "@/app/lib/gate";
import { useNavigate } from "@/app/lib/router-compat";
import { PitchPill } from "@/app/flow/PitchPanel";
import { toAnswers } from "@/app/lib/answers";

import { Button } from "@/components/ui/button";
import { Ticker } from "@/components/look/Ticker";

export const Route = createFileRoute("/leads")({
  validateSearch: z.object({ event: z.string().optional(), demo: z.number().optional() }),
  head: () => ({
    meta: [
      { title: "Pick companies — First Hundred" },
      { name: "description", content: "Companies that fit your buyer, picked from your interview. Add your own or import an event." },
      { property: "og:title", content: "Pick companies — First Hundred" },
      { property: "og:description", content: "Companies that fit your buyer, picked from your interview. Add your own or import an event." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GatedLeads,
});

type Row = { key: string; company: string; url: string; why: string; name?: string; ticked: boolean; tag: "Suggested" | "Event" | "Yours" | "Signal" };
type Status = "loading" | "ready" | "error";

const toUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
const host = (u: string) => u.replace(/^https?:\/\//i, "").replace(/^www\./, "").replace(/\/.*$/, "").toLowerCase();
const parse = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : v) as Record<string, unknown>;
const MAX_PICKS = 3;

function LeadsPage() {
  useDemoSeed();
  const { ws, set, extractingInterview, isDemo } = useWorkspace();
  const nav = useNavigate();
  const { event } = Route.useSearch();
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [more, setMore] = useState(false);
  const [paste, setPaste] = useState("");
  const [eventUrl, setEventUrl] = useState(event ?? "");
  const [eventBusy, setEventBusy] = useState(false);
  const [note, setNote] = useState("");
  const asked = useRef(false);

  const add = (next: Row[], tick = false) =>
    setRows((old) => {
      const seen = new Set(old.map((r) => host(r.url)));
      const fresh = next.filter((r) => r.url && !seen.has(host(r.url)) && seen.add(host(r.url)));
      const ticked = old.filter((r) => r.ticked).length;
      return [...old, ...fresh.map((r, i) => ({ ...r, ticked: tick ? ticked + i < MAX_PICKS : r.ticked }))];
    });

  const suggest = async (exclude: string[]) => {
    const i = ws.interview;
    const out = parse(await suggestLeads({ data: {
      answers: toAnswers(i),
      profile: (ws.profile as unknown as Record<string, unknown>) ?? null,
      exclude,
    } }));
    if (out.error) throw new Error(String(out.error));
    return ((out.companies as { company: string; url: string; why: string }[]) ?? []).map((c, n) => ({ key: `s${Date.now()}${n}`, ...c, ticked: false, tag: "Suggested" as const }));
  };

  // The example only shows companies already in the demo workspace; nothing is asked of the server.
  useEffect(() => {
    if (!isDemo || asked.current || ws.prospects.length === 0) return;
    asked.current = true;
    add(ws.prospects.slice(0, 5).map((p) => ({ key: `d${p.id}`, company: p.company || p.author, url: p.company_url || `demo:${p.id}`, why: p.reason || p.why_now, ticked: false, tag: "Suggested" })), true);
    setStatus("ready");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, ws.prospects.length]);

  useEffect(() => {
    if (isDemo) return;
    // The interview is still being read: suggest once its answers are in.
    if (asked.current || extractingInterview) return;
    asked.current = true;
    // Companies already found from public posts come first: they said the pain out loud.
    const signals: Row[] = ws.prospects.filter((p) => p.company_url).slice(0, 5).map((p) => ({ key: `g${p.id}`, company: p.company || host(p.company_url!), url: toUrl(p.company_url!), why: p.reason, name: p.author, ticked: false, tag: "Signal" }));
    add(signals, true);
    if (!ws.interview && !ws.profile) { setStatus("ready"); return; }
    suggest(signals.map((r) => r.url)).then((r) => { add(r, true); setStatus("ready"); }).catch(() => setStatus("error"));
    if (event) void importEvent(event);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extractingInterview]);

  const findMore = async () => {
    setMore(true);
    try { add(await suggest(rows.map((r) => r.url))); } catch { setNote("Could not find more right now. Paste your own below."); }
    setMore(false);
  };

  const importEvent = async (url: string) => {
    if (!url.trim()) return;
    setEventBusy(true); setNote("");
    try {
      const out = parse(await getEventLeads({ data: { url: url.trim(), profile: ws.profile ?? ws.interview ?? null } }));
      if (out.error) throw new Error(String(out.error));
      const leads = (out.leads as { name: string; company: string; url: string; why: string }[]).filter((l) => l.url);
      add(leads.slice(0, 15).map((l, n) => ({ key: `e${Date.now()}${n}`, company: l.company || host(l.url), url: toUrl(l.url), why: l.why, name: l.name, ticked: false, tag: "Event" })));
      setNote(leads.length ? `Added ${Math.min(leads.length, 15)} companies from ${String(out.event ?? "the event")}.` : "That event lists no company websites. Paste them below instead.");
    } catch (e) { setNote(e instanceof Error ? e.message : "Could not read that event page."); }
    setEventBusy(false);
  };

  const addPasted = () => {
    const lines = paste.split(/[\n,]/).map((l) => l.trim()).filter((l) => /\./.test(l));
    add(lines.map((u, n) => ({ key: `p${Date.now()}${n}`, url: toUrl(u), company: host(u), why: "Added by you", ticked: true, tag: "Yours" })));
    setPaste("");
  };

  const picked = rows.filter((r) => r.ticked);
  const toggle = (key: string) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ticked: !r.ticked } : r)));
  const go = () => {
    set({ selectedLeads: picked.map(({ company, url, why, name }) => ({ company, url, why, ...(name ? { name } : {}) })) });
    nav("/preview");
  };

  return (
    <div className="min-h-screen text-ink">
      <PitchPill />
      <main className="mx-auto max-w-2xl px-6 pb-40 pt-20">
        <h1 className="text-3xl font-medium tracking-tight">Who should get a film?</h1>
        <p className="mt-2 text-grain">Picked from your interview. Tick the ones you want, add your own, or import an event.</p>
        {status === "loading" && rows.length === 0 ? (
          <div className="mt-10"><Ticker phase="leads" /></div>
        ) : (
          <>
            {status === "error" && <p className="mt-8 text-sm text-grain">We could not suggest companies right now. Paste your own or import an event below.</p>}
            {status === "ready" && rows.length === 0 && <p className="mt-8 text-sm text-grain">No suggestions yet. Paste company websites or import an event below.</p>}
            <ul className="mt-6 space-y-1">
              {rows.map((r) => (
                <li key={r.key} className="px-4">
                  <Button
                    variant="bare" type="button"
                    onClick={() => toggle(r.key)}
                    className="flex h-auto w-full items-start justify-start gap-5 whitespace-normal rounded-none px-0 py-4 text-left"
                    aria-pressed={r.ticked}
                  >
                    <span className={`mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ink ${r.ticked ? "bg-ink" : ""}`}>
                      {r.ticked && <span className="block h-2 w-1 -translate-y-px rotate-45 border-b-2 border-r-2 border-screen" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-2xl font-normal tracking-normal">{r.company}<span className="ml-3 align-middle text-xs text-grain">{r.tag === "Signal" ? "Posted about it" : r.tag === "Event" ? "From the event" : r.tag === "Yours" ? "Yours" : ""}</span></span>
                      {r.why && <span className="mt-1 block text-sm text-grain">{r.name ? `${r.name} · ` : ""}{r.why}</span>}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
            {!isDemo && status !== "loading" && rows.length > 0 && (ws.interview || ws.profile) && (
              <Button variant="bare" type="button" onClick={findMore} disabled={more} className="mt-4 text-sm text-grain hover:text-ink">{more ? "Finding more…" : "+ find more like these"}</Button>
            )}
            <div className="mt-10 space-y-6">
              <div>
                <label htmlFor="paste" className="text-sm text-grain">Paste company websites (one per line or comma separated)</label>
                <textarea id="paste" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="acme.com, example.io" rows={3}
                  className="mt-1 w-full resize-none border-0 border-b border-rule bg-transparent py-2 text-lg outline-none placeholder:text-grain focus:border-ink" />
                <Button variant="secondary" type="button" onClick={addPasted} disabled={!paste.trim()} className="mt-2">Add</Button>
              </div>
              {isDemo ? <DemoNote /> : <div>
                <label htmlFor="event" className="text-sm text-grain">Import the companies from a Luma event page</label>
                <div className="mt-1 flex gap-3">
                  <input id="event" value={eventUrl} onChange={(e) => setEventUrl(e.target.value)} placeholder="lu.ma/your-event"
                    className="h-11 min-w-0 flex-1 border-0 border-b border-rule bg-transparent text-lg outline-none placeholder:text-grain focus:border-ink" />
                  <Button variant="secondary" type="button" onClick={() => importEvent(eventUrl)} disabled={eventBusy || !eventUrl.trim()}>{eventBusy ? "Reading…" : "Import"}</Button>
                </div>
              </div>}
              {note && <p className="text-sm text-grain" role="status">{note}</p>}
            </div>
            <div className="fixed inset-x-0 bottom-8 z-30 flex flex-col items-center gap-2">
              {picked.length > MAX_PICKS && <p className="rounded-full bg-screen/90 px-3 py-1 text-xs text-grain">Films take a few minutes each. Start with {MAX_PICKS}; you can come back for the rest.</p>}
              <Button type="button" onClick={go} disabled={picked.length === 0} variant="primary" className="h-14 px-8 text-base">
                Make {picked.length} {picked.length === 1 ? "film" : "films"}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function GatedLeads() {
  return <RequireAuthOrDemo><LeadsPage /></RequireAuthOrDemo>;
}

import { useRef, useState } from "react";
import { Navigate } from "@/app/lib/router-compat";
import { Loader2, Plus, Upload } from "lucide-react";
import { useWorkspace } from "../lib/store";
import { api } from "../lib/api";
import { parseConnections, warmPathsFor } from "../lib/network";
import type { Connection, Prospect } from "../lib/types";
import { Avatar } from "../components/IntentBadge";
import { goalOf } from "../lib/goal";

// what "buyer" and "connector" mean for each goal
const WORDS = {
  customers: { could: "Could buy", couldH: "Already know them: could buy", intro: "Can introduce", introH: "Can introduce buyers", them: "buyers" },
  investors: { could: "Could invest", couldH: "Already know them: could invest", intro: "Can introduce", introH: "Can introduce investors", them: "investors" },
  hires: { could: "Could join", couldH: "Already know them: could join", intro: "Can refer", introH: "Can refer candidates", them: "candidates" },
} as const;

const BATCH = 250;

export default function Network() {
  const { ws, set } = useWorkspace();
  const w = WORDS[goalOf(ws.profile?.goal)];
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  if (!ws.profile) return <Navigate to="/" />;
  const conns = ws.connections ?? [];
  const buyers = conns.filter((c) => c.kind === "buyer").sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const connectors = conns.filter((c) => c.kind === "connector").sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const intros = ws.prospects.map((p) => ({ p, via: warmPathsFor(p, conns) })).filter((x) => x.via.length);
  const added = new Set(ws.prospects.map((p) => p.id));

  const load = async (f: File) => {
    setError("");
    try {
      const all = parseConnections(await f.text());
      if (!all.length) throw new Error("No connections found in that file.");
      set({ connections: all });
      const scored: Connection[] = [...all];
      const rows = all.filter((c) => c.position || c.company);
      for (let i = 0; i < rows.length && i < 2000; i += BATCH) {
        setBusy(`Reading ${Math.min(i + BATCH, rows.length)} of ${rows.length} connections for ${w.them} and connectors…`);
        const { matches } = await api.warm(ws.profile!, rows.slice(i, i + BATCH).map(({ i, position, company }) => ({ i, position, company })));
        for (const m of matches) if (scored[m.i]) scored[m.i] = { ...scored[m.i], kind: m.kind, score: m.score, reason: m.reason };
        set({ connections: [...scored] });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  };

  const addBuyer = (c: Connection) => {
    const p: Prospect = {
      id: `nw-${c.i}-${c.name.toLowerCase().replace(/\W+/g, "-")}`, source: "network", author: c.name, title: c.position,
      excerpt: [c.position, c.company].filter(Boolean).join(" at "), url: c.url ?? "", date: new Date().toISOString(),
      community: "Your network", keyword: "network", company: c.company || undefined, role: "connection",
      score: c.score ?? 70, reason: c.reason ?? "", why_now: "you're already connected", stage: "new",
    };
    set({ prospects: [p, ...ws.prospects.filter((x) => x.id !== p.id)] });
  };

  return (
    <div className="fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl uppercase">Warm paths</h1>
          <p className="mt-1 max-w-2xl text-grain">Your own network is where most first customers come from, and an intro from someone they know gets answered far more often than a cold note. Start here, then go cold with films.</p>
        </div>
        <button className="btn-primary" onClick={() => file.current?.click()} disabled={!!busy}><Upload className="h-4 w-4" /> {conns.length ? "Load a new export" : "Load your LinkedIn connections"}</button>
        <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f); e.target.value = ""; }} />
      </div>

      {busy && <div className="card flex items-center gap-3 border-ink p-4 text-sm font-medium"><span className="rec-dot h-2 w-2 rounded-full bg-tally" />{busy}</div>}
      {error && <div className="border-l-[3px] border-ink bg-white p-4 text-sm">! {error}</div>}

      {!conns.length && (
        <ol className="card divide-y divide-rule">
          {[
            ["On LinkedIn, open Settings → Data privacy → Get a copy of your data.", "Choose “Connections” only. LinkedIn emails you a download link, usually within minutes."],
            ["Download the archive and find Connections.csv.", "It lists each connection's name, company and position. It stays in your browser; only positions and companies are sent to the AI, never names or emails."],
            ["Load it here.", "You'll see who in your network could buy, join or invest, who can introduce them, and which prospects you can reach through someone you know."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-4 p-5"><span className="tc text-3xl text-grain">{String(i + 1).padStart(2, "0")}</span><div><div className="font-semibold">{t}</div><p className="text-sm text-grain">{d}</p></div></li>
          ))}
        </ol>
      )}

      {!!conns.length && (
        <div className="grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-4">
          {[["Connections", conns.length], [w.could, buyers.length], [w.intro, connectors.length], ["Intros to prospects", intros.length]].map(([l, v]) => (
            <div key={l} className="bg-white p-4"><div className="label">{l}</div><div className="tc text-3xl">{v}</div></div>
          ))}
        </div>
      )}

      {!!intros.length && (
        <section>
          <h2 className="display text-3xl uppercase">Intros you can ask for</h2>
          <div className="mt-3 card divide-y divide-rule">
            {intros.map(({ p, via }) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                <Avatar name={via[0].name} size={32} />
                <div className="min-w-0 flex-1 text-sm"><b>{via.map((v) => v.name).join(", ")}</b> {via.length > 1 ? "work" : "works"} at {p.company ?? via[0].company}. Ask for an intro to <b>{p.author}</b>.</div>
                <span className="text-xs text-grain">Open {p.author} in Prospects to draft the ask</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!!buyers.length && (
        <section>
          <h2 className="display text-3xl uppercase">{w.couldH}</h2>
          <div className="mt-3 card divide-y divide-rule">
            {buyers.map((c) => {
              const id = `nw-${c.i}-${c.name.toLowerCase().replace(/\W+/g, "-")}`;
              return (
                <div key={c.i} className="flex items-center gap-3 p-4">
                  <Avatar name={c.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{c.name} <span className="font-normal text-grain">· {c.position}{c.company ? ` at ${c.company}` : ""}</span></div>
                    <p className="text-sm text-grain">{c.reason}</p>
                  </div>
                  <span className="tc text-lg">{c.score}</span>
                  <button className="btn-outline" disabled={added.has(id)} onClick={() => addBuyer(c)}>{added.has(id) ? "Added" : <><Plus className="h-4 w-4" /> Prospect</>}</button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!!connectors.length && (
        <section>
          <h2 className="display text-3xl uppercase">{w.introH}</h2>
          <div className="mt-3 card divide-y divide-rule">
            {connectors.slice(0, 25).map((c) => (
              <div key={c.i} className="flex items-center gap-3 p-4">
                <Avatar name={c.name} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{c.name} <span className="font-normal text-grain">· {c.position}{c.company ? ` at ${c.company}` : ""}</span></div>
                  <p className="text-sm text-grain">{c.reason}</p>
                </div>
                {c.url && <a className="btn-ghost text-xs" href={c.url} target="_blank" rel="noreferrer">LinkedIn</a>}
              </div>
            ))}
          </div>
        </section>
      )}
      {busy && !conns.some((c) => c.kind) && <Loader2 className="h-5 w-5 animate-spin" />}
    </div>
  );
}

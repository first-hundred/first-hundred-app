import { useState } from "react";
import { Check, Copy, HeartHandshake, Loader2, Quote, Users } from "lucide-react";
import { useWorkspace } from "../lib/store";
import { api } from "../lib/api";
import { warmPathsFor } from "../lib/network";
import type { Connection, Prospect } from "../lib/types";
import { PERSON, goalOf, isProofLabel, proofLabel } from "../lib/goal";

function Draft({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2">
      <textarea className="input h-40 leading-relaxed" defaultValue={text} />
      <button className="btn-outline mt-1" onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
      </button>
    </div>
  );
}

/** Warm intro asks (someone you know at their company) and, once they're a customer, the referral ask. */
export function AskPanel({ p }: { p: Prospect }) {
  const { ws } = useWorkspace();
  const via = warmPathsFor(p, ws.connections);
  const [busy, setBusy] = useState("");
  const [text, setText] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const run = async (key: string, mode: "intro" | "referral" | "quote", v?: Connection) => {
    setBusy(key); setError("");
    try {
      const r = await api.ask(ws.profile!, p, mode, v ? { name: v.name, position: v.position, company: v.company } : undefined);
      setText((t) => ({ ...t, [key]: r.message }));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(""); }
  };

  if (!via.length && p.stage !== "customer") return null;
  return (
    <div className="space-y-4">
      {!!via.length && p.source !== "network" && (
        <div className="rounded-lg border border-ink bg-stock/20 p-4">
          <div className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4" /> Warm path</div>
          <p className="text-sm">You know {via.map((v) => v.name).join(", ")} at {p.company ?? via[0].company}. An intro gets answered far more often than a cold note, so ask first.</p>
          {via.map((v) => (
            <div key={v.i} className="mt-2">
              <button className="btn-ink" disabled={!!busy} onClick={() => run(`intro-${v.i}`, "intro", v)}>
                {busy === `intro-${v.i}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Ask {v.name.split(" ")[0]} for the intro
              </button>
              {text[`intro-${v.i}`] && <Draft text={text[`intro-${v.i}`]} />}
            </div>
          ))}
        </div>
      )}
      {p.stage === "customer" && <ProofLoop p={p} busy={busy} text={text} run={run} />}
      {error && <p className="border-l-[3px] border-rule pl-2 text-sm">! {error}</p>}
    </div>
  );
}

/**
 * The proof loop: every new customer is asked for one sentence and two intros. Their sentence goes into
 * the next films, and the count goes in as a proof number, so customer 10 helps land customer 11.
 */
function ProofLoop({ p, busy, text, run }: {
  p: Prospect; busy: string; text: Record<string, string>;
  run: (key: string, mode: "intro" | "referral" | "quote") => Promise<void>;
}) {
  const { ws, set, updateProspect, stats } = useWorkspace();
  const goal = goalOf(ws.profile?.goal);
  const pitch = ws.profile?.pitch;
  const first = p.author.split(" ")[0];
  const q = (p.quote ?? "").trim().replace(/^["“]|["”]$/g, "");
  const line = q ? `"${q}" (${first}${p.company ? `, ${p.company}` : ""})` : "";
  const inFilms = !!line && !!pitch?.points.includes(line);
  const label = proofLabel(goal, stats.customers);
  const counted = pitch?.proof.some((x) => x.label === label && x.value === String(stats.customers));

  const addQuote = () => {
    if (!ws.profile || !pitch || !line) return;
    const mine = (x: string) => x.endsWith(`(${first}${p.company ? `, ${p.company}` : ""})`);
    set({ profile: { ...ws.profile, pitch: { ...pitch, points: [line, ...pitch.points.filter((x) => !mine(x))].slice(0, 6) } } });
  };
  const addCount = () => {
    if (!ws.profile || !pitch) return;
    const proof = [{ value: String(stats.customers), label }, ...pitch.proof.filter((x) => !isProofLabel(goal, x.label))].slice(0, 3);
    set({ profile: { ...ws.profile, pitch: { ...pitch, proof } } });
  };

  return (
    <div className="space-y-4 rounded-lg border border-ink p-4">
      <div>
        <div className="flex items-center gap-2 font-semibold"><HeartHandshake className="h-4 w-4" /> Turn this {PERSON[goal]} into the next two</div>
        <p className="text-sm text-grain">Ask while the yes is fresh: one sentence you can quote, and two intros. Their words go into every film after this one.</p>
      </div>

      <div className="border-t border-rule pt-3">
        <div className="label flex items-center gap-1.5"><Quote className="h-3.5 w-3.5" /> 1. Their words</div>
        <button className="btn-outline mt-2" disabled={!!busy} onClick={() => run("quote", "quote")}>
          {busy === "quote" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Write the quote ask
        </button>
        {text.quote && <Draft text={text.quote} />}
        <textarea className="input mt-2 h-20" placeholder={`Paste what ${first} wrote back, e.g. "We booked 6 calls in our first week."`}
          value={p.quote ?? ""} onChange={(e) => updateProspect(p.id, { quote: e.target.value })} />
        {q && q.length > 100 && <p className="text-xs text-grain">Films show about 100 characters. Trim it to the strongest sentence.</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn-primary" disabled={!line || !pitch || inFilms} onClick={addQuote}>
            {inFilms ? <><Check className="h-4 w-4" /> In your next films</> : "Put it in your next films"}
          </button>
          <button className="btn-outline" disabled={!pitch || !stats.customers || counted} onClick={addCount}>
            {counted ? <><Check className="h-4 w-4" /> {stats.customers} {label}</> : `Show "${stats.customers} ${label}" as proof`}
          </button>
        </div>
        {!pitch && <p className="mt-1 text-xs text-grain">Add your pitch on the profile page first.</p>}
      </div>

      <div className="border-t border-rule pt-3">
        <div className="label">2. Two intros</div>
        <button className="btn-primary mt-2" disabled={!!busy} onClick={() => run("referral", "referral")}>
          {busy === "referral" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Write the referral ask
        </button>
        {text.referral && <Draft text={text.referral} />}
      </div>
    </div>
  );
}

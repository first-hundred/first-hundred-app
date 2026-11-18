import { useState } from "react";
import { useWorkspace } from "../lib/store";
import { GOALS, goalOf } from "../lib/goal";

/**
 * The plan back from the goal. The first 100 don't come from one channel: the first few come from
 * people you already know, the middle from direct outreach to people showing a signal, and the
 * rest compound from referrals. Each stage gets its own funnel and its own daily quota.
 */
type Stage = { key: string; title: string; channel: string; upTo: number; ask: string; rate: number; rateNote: string };

export function RoadTo100() {
  const { ws, stats } = useWorkspace();
  const goal = goalOf(ws.profile?.goal);
  const g = GOALS[goal];
  const measured = stats.contacted >= 10;
  const [reply, setReply] = useState(measured ? stats.replyRate : 57); // coldopen: 57% of ~300 films got a reply
  const [call, setCall] = useState(50);
  const [close, setClose] = useState(goal === "investors" ? 15 : goal === "hires" ? 20 : 25);
  const [perDay, setPerDay] = useState(10);

  const t = g.target;
  const film = (reply / 100) * (call / 100) * (close / 100);
  const warm = 0.5 * (close / 100); // an intro from someone they trust usually gets the meeting
  const stages: Stage[] = [
    { key: "net", title: `First ${Math.round(t * 0.1)}`, channel: "People you know and their intros", upTo: Math.round(t * 0.1), ask: "intros", rate: warm, rateNote: "about half of warm intros become a meeting" },
    { key: "film", title: `To ${Math.round(t * 0.5)}`, channel: "Films to people showing a signal", upTo: Math.round(t * 0.5), ask: "films", rate: film, rateNote: `${reply}% reply × ${call}% call × ${close}% yes` },
    { key: "ref", title: `To ${t}`, channel: "Referrals from customers, events, films", upTo: t, ask: "asks", rate: (warm + film) / 2, rateNote: "each customer asked for two intros, plus films" },
  ];
  let from = 0;
  const rows = stages.map((s) => {
    const need = Math.max(0, s.upTo - Math.max(from, stats.customers));
    const asks = s.rate > 0 ? Math.ceil(need / s.rate) : 0;
    const done = stats.customers >= s.upTo;
    const current = !done && stats.customers >= from;
    from = s.upTo;
    return { ...s, need, asks, done, current };
  });
  const totalAsks = rows.reduce((n, r) => n + r.asks, 0);
  const days = Math.ceil(totalAsks / Math.max(1, perDay));
  const finish = (() => { const d = new Date(); let k = days; while (k > 0) { d.setDate(d.getDate() + 1); if (d.getDay() % 6 !== 0) k--; } return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); })();

  const slider = (label: string, v: number, set: (n: number) => void, hint: string) => (
    <label className="block">
      <div className="flex items-baseline justify-between"><span className="text-xs text-white/60">{label}</span><span className="tc text-lg">{v}%</span></div>
      <input type="range" min={1} max={100} value={v} onChange={(e) => set(+e.target.value)} className="w-full accent-[#FFC21A]" />
      <div className="text-[10px] text-white/40">{hint}</div>
    </label>
  );

  return (
    <div className="overflow-hidden rounded-lg bg-ink text-white">
      <div className="grid gap-6 p-5 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="text-xs font-semibold text-stock">Road to {t}</div>
          <div className="mt-1 display text-5xl uppercase">{totalAsks.toLocaleString()} conversations</div>
          <p className="mt-1 text-sm text-white/70">
            At <input type="number" min={1} max={200} value={perDay} onChange={(e) => setPerDay(Math.max(1, +e.target.value || 1))}
              className="tc w-14 rounded bg-white/10 px-1 text-center text-base text-stock outline-none" /> a day, that's <b className="text-white">{days} working days</b>: {goal === "hires" ? "hire" : goal === "investors" ? "investor" : "customer"} {t} by <b className="text-stock">{finish}</b>.
          </p>
          <ol className="mt-4 divide-y divide-white/10 rounded border border-white/15">
            {rows.map((r, i) => (
              <li key={r.key} className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5 ${r.current ? "bg-white/10" : ""} ${r.done ? "opacity-50" : ""}`}>
                <span className="tc text-2xl text-white/40">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="text-sm font-semibold">{r.title}: {r.channel} {r.current && <span className="ml-1 rounded bg-tally px-1.5 py-0.5 text-[10px]">Now</span>}{r.done && " ✓"}</div>
                  <div className="text-[11px] text-white/50">{r.rateNote}</div>
                </div>
                <div className="text-right"><div className="tc text-xl">{r.asks.toLocaleString()}</div><div className="text-[10px] text-white/50">{r.ask}</div></div>
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-3">
          {slider("Film → reply", reply, setReply, measured ? `Your measured rate from ${stats.contacted} sent` : "coldopen's measured rate: 57% of ~300 films")}
          {slider("Reply → call", call, setCall, "Replies that turn into a call")}
          {slider(`Call → ${g.won.toLowerCase()}`, close, setClose, "Calls that say yes")}
          <p className="text-[11px] leading-relaxed text-white/40">The order follows how startups actually got their first customers: their own network first, then direct outreach, then referrals as customers bring customers.</p>
        </div>
      </div>
      <div className="clapper h-2" />
    </div>
  );
}

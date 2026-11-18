import type { Prospect, Stage } from "./types";

/** Same plan math as the Road to 100 panel, with its default rates. */
export function roadPlan(o: { customers: number; contacted: number; replyRate: number; target?: number; closeRate?: number; perDay?: number; today?: Date }) {
  const t = o.target ?? 100;
  const perDay = o.perDay ?? 10;
  const reply = o.contacted >= 10 ? o.replyRate : 57;
  const call = 50;
  const close = o.closeRate ?? 25;
  const film = (reply / 100) * (call / 100) * (close / 100);
  const warm = 0.5 * (close / 100);
  const stages = [
    { upTo: Math.round(t * 0.1), rate: warm },
    { upTo: Math.round(t * 0.5), rate: film },
    { upTo: t, rate: (warm + film) / 2 },
  ];
  let from = 0;
  let totalAsks = 0;
  for (const s of stages) {
    const need = Math.max(0, s.upTo - Math.max(from, o.customers));
    totalAsks += s.rate > 0 ? Math.ceil(need / s.rate) : 0;
    from = s.upTo;
  }
  const days = Math.ceil(totalAsks / Math.max(1, perDay));
  const d = new Date(o.today ?? new Date());
  let k = days;
  while (k > 0) { d.setDate(d.getDate() + 1); if (d.getDay() % 6 !== 0) k--; }
  return { perDay, totalAsks, days, finish: d };
}

const demo = (id: string, company: string, stage: Stage): Prospect => ({
  id: `demo-${id}`, source: "network", author: company, company, title: company, excerpt: "", url: "",
  date: new Date().toISOString(), keyword: "", score: 70, reason: "", why_now: "", stage,
  contactedAt: new Date().toISOString(),
});

export const DEMO_PROSPECTS: Prospect[] = [
  demo("jpm", "JPMorgan", "contacted"),
  demo("clarifi", "ClariFi VC", "contacted"),
  demo("faraday", "Faraday.ai", "replied"),
  demo("lingcode", "LingCode", "call"),
  demo("vantage", "Vantage Property", "customer"),
  demo("northwind", "Northwind Labs", "customer"),
  demo("harbor", "Harbor Health", "customer"),
];

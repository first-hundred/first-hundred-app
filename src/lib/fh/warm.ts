// Warm paths: which of the founder's own connections are buyers, and who can introduce them.
// Personal network is the #1 source of first customers overall, and warm intros get replies far
// more often than cold outreach, so the founder's own LinkedIn export is the first list to work.
import { geminiJSON } from "./gemini";
import type { CustomerProfile, Env } from "./types";

type Row = { i: number; position: string; company: string };
type Out = { i: number; kind: "buyer" | "connector"; score: number; reason: string };

export async function run(body: { profile: CustomerProfile; connections: Row[] }, env: Env) {
  const p = body.profile;
  const investors = p.goal === "investors";
  const hires = p.goal === "hires";
  const rows = (body.connections ?? []).slice(0, 250);
  if (!rows.length) return { matches: [] as Out[] };
  const prompt = `A founder exported their LinkedIn connections. Find the ones worth a message this week.

FOUNDER'S COMPANY: ${p.company_name}: ${p.product_one_liner}
GOAL: ${hires ? "make the first 10 hires" : investors ? "raise a first round" : "land the first 100 customers"}
IDEAL ${hires ? "HIRE" : investors ? "INVESTOR" : "CUSTOMER"}: ${p.ideal_customer.role} at ${p.ideal_customer.company_type} (${p.ideal_customer.company_size})

For each connection that matters, return:
- kind "buyer": they themselves fit the ideal ${hires ? "hire (could join as this role)" : investors ? "investor (angel, VC, scout)" : "customer (would use or buy this)"}.
- kind "connector": not a buyer, but well placed to introduce several ${hires ? "candidates (e.g. an engineering manager, a recruiter, a founder, or a community lead)" : "buyers (e.g. a founder, investor, community lead, or someone senior in the buyers' industry)"}.
- score 0-100 for how valuable a message to them is this week.
- reason: one short sentence about them in the third person ("they", never "you"), specific to their role and company.
Skip everyone else. Judge only from position and company. At most 40 results.

Return JSON: {"matches": [{"i": number, "kind": "buyer"|"connector", "score": number, "reason": string}]}

CONNECTIONS (i | position | company):
${rows.map((r) => `${r.i} | ${r.position} | ${r.company}`).join("\n")}`;
  const out = await geminiJSON<{ matches: Out[] }>(env, prompt, 0.2);
  return { matches: Array.isArray(out.matches) ? out.matches : [] };
}

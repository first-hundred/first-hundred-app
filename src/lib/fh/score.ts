import { geminiJSON } from "./gemini";
import type { Candidate, CustomerProfile, Env, Scored } from "./types";

export async function run(body: { profile: CustomerProfile; candidates: Candidate[] }, env: Env) {
  const { profile, candidates } = body;
  if (!candidates?.length) return { scored: [] };
  const list = candidates.slice(0, 60).map((c) => ({
    id: c.id,
    where: c.community,
    date: c.date?.slice(0, 10),
    text: c.excerpt.slice(0, 400),
  }));
  const investors = profile.goal === "investors";
  const hires = profile.goal === "hires";
  const prompt = `You qualify ${hires ? "candidates for a startup's first hires. Score each post 0-100 for how likely its AUTHOR is a strong fit for this role and open to joining an early startup soon" : investors ? "investor leads for a startup raising its first round. Score each post 0-100 for how likely its AUTHOR is to invest in (or intro investors to) this company soon" : "leads for a startup. Score each post 0-100 for how likely its AUTHOR is to be a buyer of this product soon"}.

PRODUCT: ${profile.product_one_liner}
IDEAL ${hires ? "HIRE" : investors ? "INVESTOR" : "CUSTOMER"}: ${profile.ideal_customer.role} at ${profile.ideal_customer.company_type} (${profile.ideal_customer.company_size})
${hires ? "WHAT THEY WANT" : investors ? "WHAT THEY LOOK FOR" : "PAINS"}: ${profile.top_pains.join("; ")}
BUYING TRIGGERS: ${profile.trigger_events.join("; ")}

Scoring guide: ${hires
    ? "80-100 = author fits the role and is looking for a job or open to an early startup; 50-79 = author fits the profile and talks about work like this; 20-49 = related but not a fit or clearly not looking; 0-19 = irrelevant, a recruiter, or a company posting a job"
    : investors
    ? "80-100 = author is clearly an investor (angel/VC/scout) with a matching thesis or is asking for deals in this space; 50-79 = author is an investor or operator-angel in an adjacent space; 20-49 = interested commentator, not an investor; 0-19 = irrelevant"
    : "80-100 = author personally has the pain right now or is asking for a solution/tool; 50-79 = author fits the customer profile and discusses the problem; 20-49 = related but not a buyer (commentator, vendor, student); 0-19 = irrelevant or the post is self-promotion"}.
reason: one short sentence, concrete, referencing what they said.
why_now: one short phrase on timing (e.g. "asked for tool recommendations 3 days ago"), or "" if none.

company / company_url: if the author says they work at or run a specific company, its name and website domain (e.g. "acme.com"); otherwise "" for both. Never guess.

Return JSON array: [{"id": string, "score": number, "reason": string, "why_now": string, "company": string, "company_url": string}] covering every id.

POSTS:
${JSON.stringify(list)}`;
  const scored = await geminiJSON<Scored[]>(env, prompt, 0.2);
  return { scored: Array.isArray(scored) ? scored : [] };
}

import { isPublicHttpUrl, safeFetch } from "./safe-url";
import { geminiJSON, stripHtml } from "./gemini";
import type { CustomerProfile, Env, Goal } from "./types";

async function readSite(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    if (!isPublicHttpUrl(url)) throw new Error("Use a public HTTP or HTTPS URL.");
  const res = await safeFetch(url, {
      signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; FirstHundredBot/0.1)", accept: "text/html" },
    });
    if (!res.ok) throw new Error(`site returned ${res.status}`);
    const html = await res.text();
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
    const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] ?? "";
    return `TITLE: ${stripHtml(title)}\nMETA: ${desc}\nPAGE: ${stripHtml(html).slice(0, 7000)}`;
  } finally {
    clearTimeout(t);
  }
}

export async function run(body: { url?: string; description?: string; goal?: Goal }, env: Env) {
  const goal = body.goal ?? "customers";
  let url = (body.url ?? "").trim();
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  let source = body.description?.trim() ?? "";
  let siteError: string | null = null;
  if (url) {
    try {
      source = `${await readSite(url)}\n\nFOUNDER NOTES: ${source}`;
    } catch (e) {
      siteError = e instanceof Error ? e.message : String(e);
      if (!source) return { needsDescription: true, error: `Couldn't read ${url} (${siteError}). Paste a short description instead.` };
    }
  }
  if (!source) throw new Error("Provide a URL or a description.");

  const schema = `{"company_name": string, "product_one_liner": string, "ideal_customer": {"role": string, "company_type": string, "company_size": string}, "top_pains": [3 strings], "trigger_events": [3 strings], "where_they_hang_out": [4-6 strings], "pain_keywords": [8 strings], "positioning_line": string, "pitch": {"offer": string, "points": [3-4 strings], "proof": [{"value": string, "label": string}], "cta_line": string}}`;
  const pitchRules = `pitch is what the founder's 30-second outreach film says: offer = one line (max 100 chars) on what they offer, in the buyer's terms; points = 3-4 concrete value props from the site (max 90 chars each, no hype words); proof = 1-3 numbers stated VERBATIM on the website (customers, users, stars, speed, savings), value max 10 chars (e.g. "40k", "3x", "1 day"), label max 50 chars, or an empty array if the site states no numbers (never invent one); cta_line = a small ask, max 40 chars (e.g. "Worth a 15-minute look?").`;
  const prompt = goal === "investors"
    ? `You are a sharp fundraising advisor for pre-seed and seed founders. From this startup's website text, build the investor profile the founder needs to land their first checks.

Be specific: name the kind of investor most likely to write the FIRST check (angel operators in the space, specific fund archetypes), not "VCs".
Field meanings for this goal:
- ideal_customer.role = the investor (e.g. "Partner at a pre-seed devtools fund", "angel who was a VP Sales"), company_type = fund type/thesis, company_size = typical check size
- top_pains = the 3 things these investors look for that this company can show
- trigger_events = 3 reasons this is fundable now (market timing)
- where_they_hang_out = where these investors post and gather (HN, X lists, newsletters, demo days, communities)
- pain_keywords = 8 short phrases (2-5 words) an investor with this thesis would literally write on Hacker News or Reddit (e.g. "investing in devtools", "pre-seed thesis ai agents", "angel check b2b saas")
- positioning_line = the one-sentence investor pitch

${pitchRules}

Return JSON exactly: ${schema}

WEBSITE:
${source}`
    : goal === "hires"
    ? `You are a sharp early-stage recruiting advisor. From this startup's website text, build the hiring profile the founder needs to make their first 10 hires.

Be specific: name the first role that matters most (usually a founding engineer) and the background that fits, not "great engineers".
Field meanings for this goal:
- ideal_customer.role = the first hire (e.g. "Founding full-stack engineer who has shipped AI products"), company_type = where they likely work now (e.g. "Series A-C devtools startup"), company_size = seniority (e.g. "5-10 years")
- top_pains = the 3 things these candidates want from their next job that this company can offer
- trigger_events = 3 reasons such a candidate would move now
- where_they_hang_out = where these candidates post and gather (HN "Who wants to be hired" threads, subreddits, Discords, communities)
- pain_keywords = 8 short phrases (2-5 words) such a candidate would literally write on Hacker News or Reddit while looking for their next role (e.g. "looking for founding engineer", "open to early stage", "leaving big tech startup")
- positioning_line = the one-sentence pitch to a candidate

The pitch is the recruiting film: offer = the role and what they would own, in the candidate's terms; points = concrete reasons to join; cta_line e.g. "Open to a 20-minute chat?".
${pitchRules}

Return JSON exactly: ${schema}

WEBSITE:
${source}`
    : `You are a sharp early-stage GTM advisor. From this startup's website text, build the customer profile a founder needs to land their first 100 customers.

Be specific, not generic. Prefer a narrow, reachable first customer over a broad market.
pain_keywords must be 8 short phrases (2-5 words) that a frustrated potential buyer would literally type in a Hacker News or Reddit post or comment while describing the problem (not product names, not marketing language). Example style: "spreadsheet hell invoicing", "hate manual data entry".
where_they_hang_out: specific subreddits (r/...), HN, Slack/Discord communities, newsletters.

${pitchRules}

Return JSON exactly: ${schema}

WEBSITE:
${source}`;
  const profile = await geminiJSON<CustomerProfile>(env, prompt, 0.5);
  // deno-lint-ignore no-explicit-any
  const raw = profile as any;
  const pitch = raw.pitch
    ? { offer: raw.pitch.offer ?? profile.product_one_liner, points: raw.pitch.points ?? [], proof: raw.pitch.proof ?? [], cta_line: raw.pitch.cta_line ?? "Worth a 15-minute look?", contact: "" }
    : undefined;
  return { profile: { ...profile, pitch, goal }, url, siteError };
}

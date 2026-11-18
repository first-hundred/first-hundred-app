import { geminiJSON, stripHtml } from "./gemini";
import type { Candidate, CustomerProfile, Env, Scored } from "./types";

type Person = { name: string; bio?: string; avatar?: string; link?: string; from: "host" | "featured" };

// deno-lint-ignore no-explicit-any
function proseText(node: any): string {
  if (!node) return "";
  if (typeof node.text === "string") return node.text;
  const inner = (node.content ?? []).map(proseText).join(node.type === "paragraph" || node.type === "list_item" ? "" : "\n");
  return node.type === "paragraph" || node.type === "heading" ? `${inner}\n` : inner;
}

// deno-lint-ignore no-explicit-any
function personLink(u: any): string | undefined {
  if (u.linkedin_handle) return `https://www.linkedin.com${u.linkedin_handle.startsWith("/") ? "" : "/in/"}${u.linkedin_handle}`;
  if (u.twitter_handle) return `https://x.com/${u.twitter_handle}`;
  if (u.website) return u.website;
  return undefined;
}

async function readEvent(url: string) {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; FirstHundredBot/0.1)" }, redirect: "follow" });
  if (!res.ok) throw new Error(`event page returned ${res.status}`);
  const html = await res.text();
  const next = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (next) {
    try {
      const d = JSON.parse(next[1])?.props?.pageProps?.initialData?.data;
      if (d?.event) {
        const people: Person[] = [
          // deno-lint-ignore no-explicit-any
          ...(d.hosts ?? []).map((u: any): Person => ({ name: u.name, bio: u.bio_short, avatar: u.avatar_url, link: personLink(u), from: "host" })),
          // deno-lint-ignore no-explicit-any
          ...(d.featured_guests ?? []).map((u: any): Person => ({ name: u.name, bio: u.bio_short, avatar: u.avatar_url, link: personLink(u), from: "featured" })),
        ].filter((p) => p.name);
        const loc = d.event.geo_address_info?.city_state ?? d.event.geo_address_info?.city ?? "";
        return {
          name: d.event.name as string,
          date: (d.start_at ?? d.event.start_at) as string,
          location: loc as string,
          description: proseText(d.description_mirror).slice(0, 8000),
          people,
        };
      }
    } catch { /* fall through to generic */ }
  }
  const title = stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "Event");
  return { name: title, date: "", location: "", description: stripHtml(html).slice(0, 10000), people: [] as Person[] };
}

type Extracted = {
  people: { name: string; role: string; organization: string; website: string; summary: string; score: number; reason: string; why_now: string }[];
};

export async function run(body: { url: string; profile: CustomerProfile }, env: Env) {
  let url = (body.url ?? "").trim();
  if (!url) throw new Error("Paste an event link.");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const ev = await readEvent(url);
  const goal = body.profile.goal ?? "customers";
  const p = body.profile;

  const prompt = `A founder is going to this event and wants to know exactly who to talk to there.

FOUNDER'S COMPANY: ${p.company_name} — ${p.product_one_liner}
FOUNDER'S GOAL: ${goal === "hires" ? "make their first hires (find strong candidates and people who can refer candidates)" : goal === "investors" ? "raise their first round (find investors and people who can intro investors)" : "land their first customers (find buyers, champions, and people who can intro buyers)"}
IDEAL ${goal === "hires" ? "HIRE" : goal === "investors" ? "INVESTOR" : "CUSTOMER"}: ${p.ideal_customer.role} at ${p.ideal_customer.company_type} (${p.ideal_customer.company_size})

EVENT: ${ev.name}${ev.date ? ` on ${ev.date}` : ""}${ev.location ? ` in ${ev.location}` : ""}
LISTED HOSTS / FEATURED GUESTS (with their profile bios): ${JSON.stringify(ev.people.map(({ name, bio, from }) => ({ name, bio, from })))}
EVENT DESCRIPTION:
${ev.description}

Task: list every named person connected to the event: hosts, judges/panelists, speakers, mentors, and representatives of named sponsors or partner companies (if a sponsor is named but no person, add the company itself with name = company name and role "sponsor"). Skip the founder's own company. Do not invent people who aren't named.
For each, use only what the page says (plus widely known facts about public organizations).
- role: one of host, judge, speaker, mentor, sponsor, organizer
- organization: their company or org
- website: that organization's official website (e.g. "lovable.dev", "jpmorgan.com") if stated on the page or widely known; "" if unsure. Never guess an obscure domain.
- summary: one sentence on who they are, from the page
- score 0-100: how valuable a conversation with them is for the founder's goal (direct buyer, investor or strong candidate = high; someone who can intro many buyers/investors or decides a prize = high; venue staff = low)
- reason: one concrete sentence why talk to them, tied to the founder's company
- why_now: short timing phrase grounded in the event (e.g. "judging the demos tonight", "hosts the event, easy intro at doors")

Return JSON: {"people": [...]}`;

  const out = await geminiJSON<Extracted>(env, prompt, 0.3);
  const byName = new Map(ev.people.map((x) => [x.name.toLowerCase(), x]));
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const eventSlug = slug(ev.name).slice(0, 40);

  const prospects: (Candidate & Scored)[] = (out.people ?? []).map((x) => {
    const known = byName.get(x.name.toLowerCase());
    return {
      id: `ev-${eventSlug}-${slug(x.name)}`,
      source: "event",
      author: x.name,
      title: ev.name,
      excerpt: [x.organization && `${cap(x.role)} · ${x.organization}`, x.summary || known?.bio].filter(Boolean).join(" — "),
      url: known?.link ?? url,
      date: ev.date || new Date().toISOString(),
      community: ev.name,
      keyword: "event",
      avatar: known?.avatar,
      company: x.organization || undefined,
      company_url: x.website ? x.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : undefined,
      role: x.role,
      score: Math.max(0, Math.min(100, Math.round(x.score))),
      reason: x.reason,
      why_now: x.why_now,
    };
  });
  return { event: { name: ev.name, date: ev.date, location: ev.location, url }, prospects };
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

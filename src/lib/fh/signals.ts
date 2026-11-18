import { stripHtml } from "./gemini";
import type { Candidate, Env } from "./types";

const DAY = 86400;

async function searchHN(q: string, sinceDays: number): Promise<Candidate[]> {
  const since = Math.floor(Date.now() / 1000) - sinceDays * DAY;
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=(story,comment)&hitsPerPage=30&numericFilters=created_at_i>${since}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HN ${res.status}`);
  const data = await res.json();
  // deno-lint-ignore no-explicit-any
  return (data.hits ?? []).map((h: any): Candidate => {
    const body = stripHtml(h.comment_text ?? h.story_text ?? "");
    return {
      id: `hn-${h.objectID}`,
      source: "hackernews",
      author: h.author ?? "unknown",
      title: h.title ?? h.story_title ?? "",
      excerpt: (body || h.title || "").slice(0, 500),
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
      date: h.created_at,
      community: "Hacker News",
      keyword: q,
    };
  }).filter((c: Candidate) => c.excerpt.length > 40 && c.author !== "unknown");
}

async function searchReddit(q: string): Promise<Candidate[]> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=new&t=year&limit=25&type=link`;
  const res = await fetch(url, { headers: { "user-agent": "web:first-hundred:0.1 (hackathon demo)" } });
  if (!res.ok) throw new Error(`Reddit ${res.status}`);
  const data = await res.json();
  // deno-lint-ignore no-explicit-any
  return (data.data?.children ?? []).map((c: any): Candidate => {
    const d = c.data;
    return {
      id: `rd-${d.id}`,
      source: "reddit",
      author: d.author,
      title: d.title ?? "",
      excerpt: `${d.title ?? ""}${d.selftext ? " — " + d.selftext : ""}`.slice(0, 500),
      url: `https://www.reddit.com${d.permalink}`,
      date: new Date((d.created_utc ?? 0) * 1000).toISOString(),
      community: `r/${d.subreddit}`,
      keyword: q,
    };
  }).filter((c: Candidate) => c.author && c.author !== "[deleted]" && c.author !== "AutoModerator");
}

export async function run(body: { keywords?: string[]; sinceDays?: number }, _env: Env) {
  const keywords = (body.keywords ?? []).filter(Boolean).slice(0, 10);
  if (!keywords.length) throw new Error("No keywords to search.");
  const sinceDays = body.sinceDays ?? 365;
  const stats = { hackernews: 0, reddit: 0, errors: [] as string[] };

  const jobs = keywords.flatMap((k) => [
    searchHN(k, sinceDays).then((r) => { stats.hackernews += r.length; return r; }),
    searchReddit(k).then((r) => { stats.reddit += r.length; return r; }),
  ]);
  const results = await Promise.allSettled(jobs);
  const all: Candidate[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
    else if (!stats.errors.includes(String(r.reason?.message ?? r.reason))) stats.errors.push(String(r.reason?.message ?? r.reason));
  }

  // one row per person: keep their longest post
  const byAuthor = new Map<string, Candidate>();
  for (const c of all) {
    const key = `${c.source}:${c.author.toLowerCase()}`;
    const prev = byAuthor.get(key);
    if (!prev || c.excerpt.length > prev.excerpt.length) byAuthor.set(key, c);
  }
  const candidates = [...byAuthor.values()]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 300);
  return { candidates, stats };
}

import type { Connection, Prospect } from "./types";

/** Parses LinkedIn's Connections.csv (Settings → Data privacy → Get a copy of your data → Connections). */
export function parseConnections(csv: string): Connection[] {
  const lines = csv.replace(/\r/g, "").split("\n");
  const start = lines.findIndex((l) => /first name/i.test(l) && /company/i.test(l));
  if (start < 0) throw new Error("That doesn't look like LinkedIn's Connections.csv (no 'First Name' header).");
  const header = splitCsv(lines[start]).map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.findIndex((h) => h === name);
  const [fn, ln, url, em, co, po, on] = ["first name", "last name", "url", "email address", "company", "position", "connected on"].map(col);
  const out: Connection[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.trim()) continue;
    const c = splitCsv(line);
    const name = `${c[fn] ?? ""} ${c[ln] ?? ""}`.trim();
    if (!name) continue;
    out.push({ i: out.length, name, url: c[url] || undefined, email: c[em] || undefined, company: (c[co] ?? "").trim(), position: (c[po] ?? "").trim(), connectedOn: c[on] || undefined });
  }
  return out;
}

function splitCsv(line: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out;
}

const norm = (s?: string) => (s ?? "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "")
  .replace(/\.(com|io|ai|dev|co|app|org|net|so|xyz)(\/.*)?$/, "").replace(/\b(inc|llc|ltd|gmbh|ab|corp|corporation|company|co)\b\.?/g, "")
  .replace(/[^a-z0-9]+/g, "").trim();

/** People in your network who work at this prospect's company: ask them for the intro. */
export function warmPathsFor(p: Prospect, connections: Connection[] = []): Connection[] {
  const keys = [norm(p.company), norm(p.company_url)].filter((k) => k.length >= 3);
  if (!keys.length) return [];
  // exact match, or one name starting the other ("jpmorgan" ~ "jpmorganchase", "jpmorganprivatebank")
  const same = (k: string, x: string) => k === x || (Math.min(k.length, x.length) >= 6 && (k.startsWith(x) || x.startsWith(k)));
  return connections.filter((c) => { const k = norm(c.company); return k.length >= 3 && keys.some((x) => same(k, x)); }).slice(0, 5);
}

/**
 * Signals stacked on one person. One real signal lifts reply rates well above generic cold email,
 * and stacked signals lift them further, so prospects are worked in order of how many they carry.
 */
export function signalsFor(p: Prospect, connections: Connection[] = []): string[] {
  const s: string[] = [];
  if (p.source === "hackernews" || p.source === "reddit") s.push("Said it in public");
  if (p.source === "event") s.push("Same event");
  if (p.source === "network") s.push("In your network");
  const days = (Date.now() - new Date(p.date).getTime()) / 86400000;
  if (p.source !== "event" && p.source !== "network" && days <= 30) s.push("This month");
  if (p.why_now) s.push("Why now");
  if (p.source !== "network" && warmPathsFor(p, connections).length) s.push("Warm path");
  if (p.score >= 80) s.push("Strong fit");
  return s;
}

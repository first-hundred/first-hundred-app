import type { Prospect } from "../lib/types";

type Lead = { company: string; url: string; why: string };

const siteKey = (url: string) => url.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "").toLowerCase();

/** Reuse existing company state so revisiting preview never loses a film or stage. */
export function selectedProspects(leads: Lead[], prospects: Prospect[]): Prospect[] {
  return Array.from(new Map(leads.map((lead) => [siteKey(lead.url), lead])).values()).map((lead) => {
    const existing = prospects.find((p) => siteKey(p.company_url || "") === siteKey(lead.url));
    return {
      id: `lead:${siteKey(lead.url)}`,
      source: "event", author: lead.company, title: lead.company,
      excerpt: lead.why, url: lead.url, date: "", keyword: "",
      score: 0, stage: "new", why_now: lead.why,
      ...existing,
      company: lead.company, company_url: lead.url, reason: lead.why, ticked: true,
    };
  });
}

export function previewProspects(leads: Lead[], prospects: Prospect[]): Prospect[] {
  if (leads.length) return selectedProspects(leads, prospects);
  const ticked = prospects.filter((p) => p.ticked);
  return (ticked.length ? ticked : prospects.filter((p) => p.company_url)).filter((p) => p.company || p.company_url);
}
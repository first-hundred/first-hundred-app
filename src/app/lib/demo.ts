import type { Workspace } from "./store";

/** Demo mode: open any page with ?demo=1 to load a ready founder (MBA Vault) and tonight's leads. */
export function isDemoUrl(): boolean {
  try { return new URLSearchParams(window.location.search).get("demo") === "1"; } catch { return false; }
}

const FLAG = "first-hundred:demo";
export function demoFlag(): boolean {
  try { return sessionStorage.getItem(FLAG) === "1"; } catch { return false; }
}
export function setDemoFlag(on: boolean) {
  try { if (on) sessionStorage.setItem(FLAG, "1"); else sessionStorage.removeItem(FLAG); } catch { /* blocked */ }
}

export function demoWorkspace(): Workspace {
  const now = new Date().toISOString();
  return {
    url: "https://ask-vault.com",
    interview: {
      goal: "customers",
      website: "https://ask-vault.com",
      pitch: "A library of 1,000+ business frameworks that Claude and ChatGPT read before they answer",
      buyer: { role: "Founder or head of strategy", companyType: "Early-stage startups and advisory firms", size: "5 to 200 people" },
      points: [
        "Diagnoses the business problem before it prescribes",
        "Names the frameworks it used and makes a call",
        "Four modes: solve, break, validate, brainstorm",
      ],
      proof: [{ value: "1,000+", label: "business frameworks in the library" }],
      ask: "Worth a 15-minute look?",
      contact: "https://ask-vault.com",
    },
    profile: {
      company_name: "MBA Vault",
      product_one_liner: "A library of 1,000+ business frameworks that Claude and ChatGPT read before they answer",
      ideal_customer: { role: "Founder or head of strategy", company_type: "Early-stage startups and advisory firms", company_size: "5 to 200 people" },
      top_pains: ["Generic AI answers to business questions", "No framework behind the advice", "Decisions made without a diagnosis"],
      trigger_events: ["Fundraising", "Entering a new market", "First GTM hire"],
      where_they_hang_out: ["Founder communities", "LinkedIn", "Startup events"],
      pain_keywords: ["generic ai advice", "which framework to use", "strategy decision help"],
      positioning_line: "Your AI, with an MBA's library behind every answer.",
      sender_name: "Jakob Volbracht",
      goal: "customers",
      pitch: {
        offer: "A library of 1,000+ business frameworks that Claude and ChatGPT read before they answer",
        points: ["Diagnoses the business problem before it prescribes", "Names the frameworks it used and makes a call", "Four modes: solve, break, validate, brainstorm"],
        proof: [{ value: "1,000+", label: "business frameworks in the library" }],
        cta_line: "Worth a 15-minute look?",
        contact: "https://ask-vault.com",
      },
    },
    selectedLeads: [
      { company: "JPMorgan", url: "https://www.jpmorgan.com", why: "Runs the startup and US expansion team" },
      { company: "ClariFi VC", url: "https://clarifi.vc", why: "Backs early B2B startups; frameworks for every portfolio call" },
      { company: "Lovable", url: "https://lovable.dev", why: "GTM team judging tonight; strategy for founders who build fast" },
    ],
    prospects: [],
    updatedAt: now,
  };
}

import type { Goal } from "@/lib/fh/types";
export type { Goal };

export const GOALS: Record<Goal, {
  label: string; target: number; unit: string; won: string;
  who: string; pains: string; triggers: string; keywords: string; peopleNoun: string;
}> = {
  customers: {
    label: "First 100 customers", target: 100, unit: "customers", won: "Customer",
    who: "Who buys first", pains: "Top pains", triggers: "Why they'd buy now",
    keywords: "Pain phrases we search for", peopleNoun: "people with your problem",
  },
  hires: {
    label: "First 10 hires", target: 10, unit: "hired", won: "Hired",
    who: "Who to hire first", pains: "What they want", triggers: "Why they'd move now",
    keywords: "Phrases candidates post", peopleNoun: "people you could hire",
  },
  investors: {
    label: "First 20 investors", target: 20, unit: "investors in", won: "Committed",
    who: "Who writes the first check", pains: "What they look for", triggers: "Why it's fundable now",
    keywords: "Investor phrases we search for", peopleNoun: "investors worth talking to",
  },
};

/** what the pipeline's last stage counts, as a proof line for the films ("12 customers so far") */
const PROOF: Record<Goal, [string, string]> = {
  customers: ["customer so far", "customers so far"],
  investors: ["investor committed", "investors committed"],
  hires: ["person hired so far", "people hired so far"],
};
export const proofLabel = (g: Goal, n: number) => PROOF[g][n === 1 ? 0 : 1];
export const isProofLabel = (g: Goal, label: string) => PROOF[g].includes(label);
/** one of them, in the singular */
export const PERSON: Record<Goal, string> = { customers: "customer", investors: "investor", hires: "hire" };
/** the tab name for the profile page */
export const PROFILE_TAB: Record<Goal, string> = { customers: "Customer", investors: "Investor", hires: "Hire" };

export const goalOf = (g?: Goal): Goal => g ?? "customers";

import { STAGE_LABEL, type Stage } from "./types";
export const stageLabel = (s: Stage, g?: Goal) => (s === "customer" ? GOALS[goalOf(g)].won : STAGE_LABEL[s]);

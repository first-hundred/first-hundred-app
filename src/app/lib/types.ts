export type { Candidate, CustomerProfile, Scored, Goal, Pitch } from "@/lib/fh/types";
import type { Candidate } from "@/lib/fh/types";

export type Film = {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  label?: string;
  error?: string | null;
  share?: string | null;
  film?: string | null;
  poster?: string | null;
  gif?: string | null;
  durationSec?: number | null;
  url: string;
  startedAt: string;
};

export type Connection = {
  i: number;
  name: string;
  url?: string;
  email?: string;
  company: string;
  position: string;
  connectedOn?: string;
  /** set by the warm-paths pass */
  kind?: "buyer" | "connector";
  score?: number;
  reason?: string;
};

export const STAGES = ["new", "contacted", "replied", "call", "customer"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABEL: Record<Stage, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  call: "Call",
  customer: "Customer",
};

export type Prospect = Candidate & {
  score: number;
  reason: string;
  why_now: string;
  stage: Stage;
  draft?: { subject: string; message: string };
  film?: Film;
  contactedAt?: string;
  /** what they said, in their words, once they are a customer (or hire, or investor): used as proof in the next films */
  quote?: string;
  /** picked for the film + send step on /preview */
  ticked?: boolean;
};

import type { RehearseBody } from "@/lib/fh/rehearse";
import type { Candidate, CustomerProfile, Prospect, Scored, Goal } from "./types";

import { callFn } from "@/lib/fh.functions";

export type FilmDto = {
  id: string; status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  progress: { stage?: string; label?: string } | null; error: string | null; company: string | null; durationSec: number | null;
  share: string | null; files: { film: string | null; poster: string | null; gif: string | null } | null;
};

async function call<T>(fn: string, body: unknown, _timeoutMs = 90000): Promise<T> {
  // deno-lint-ignore no-explicit-any
  const data = JSON.parse(await callFn({ data: { name: fn as any, body } }));
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const api = {
  analyze: (url: string, description?: string, goal: Goal = "customers") =>
    call<{ profile?: CustomerProfile; url?: string; needsDescription?: boolean; error?: string }>("analyze-site", { url, description, goal }),
  event: (url: string, profile: CustomerProfile) =>
    call<{ event: { name: string; date: string; location: string; url: string }; prospects: (Candidate & Scored)[] }>("event-signals", { url, profile }),
  search: (keywords: string[]) =>
    call<{ candidates: Candidate[]; stats: { hackernews: number; reddit: number; errors: string[] } }>("search-signals", { keywords }),
  score: (profile: CustomerProfile, candidates: Candidate[]) =>
    call<{ scored: Scored[] }>("score-signals", { profile, candidates }),
  draft: (profile: CustomerProfile, prospect: Prospect, variant: "helpful" | "direct") =>
    call<{ subject: string; message: string }>("draft-message", { profile, prospect, variant, filmUrl: prospect.film?.status === "succeeded" ? prospect.film.share : undefined }),
  warm: (profile: CustomerProfile, connections: { i: number; position: string; company: string }[]) =>
    call<{ matches: { i: number; kind: "buyer" | "connector"; score: number; reason: string }[] }>("warm-paths", { profile, connections }),
  ask: (profile: CustomerProfile, prospect: Prospect, mode: "intro" | "referral" | "quote", via?: { name: string; position?: string; company?: string }) =>
    call<{ subject: string; message: string }>("draft-message", { profile, prospect, mode, via, filmUrl: prospect.film?.status === "succeeded" ? prospect.film.share : undefined }),
  makeFilm: (url: string, profile: CustomerProfile, ref: string) =>
    call<FilmDto>("make-film", { action: "create", url, profile, ref }, 60000),
  filmStatus: (id: string) => call<FilmDto>("make-film", { action: "status", id }, 30000),
  // deno-lint-ignore no-explicit-any
  rehearse: <T = any>(body: RehearseBody) => call<T>("rehearse-call", body),
};

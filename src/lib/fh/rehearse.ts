// OWNER: Jakob — see docs/SPEC-call-rehearsal.md. Stub so the app builds.
import { geminiJSON } from "./gemini";
import type { CustomerProfile, Env } from "./types";

type Turn = { role: "founder" | "prospect"; text: string };
export type RehearseBody = {
  mode: "turn" | "score";
  profile: CustomerProfile;
  prospect: { author: string; excerpt: string; community?: string; reason?: string };
  goal: "customers" | "investors";
  history: Turn[];
};

export async function run(body: RehearseBody, env: Env) {
  const transcript = body.history.map((t) => `${t.role.toUpperCase()}: ${t.text}`).join("\n");
  if (body.mode === "score") {
    return await geminiJSON(env, `Grade this discovery call by the founder of ${body.profile.company_name}. Return JSON {"score": number, "criteria": [{"name": string, "score": number, "evidence": string}], "best_question": string, "missed_question": string, "summary": string}.\n\n${transcript}`);
  }
  return await geminiJSON<{ reply: string; end?: boolean }>(env, `You are ${body.prospect.author}, who wrote: "${body.prospect.excerpt}". A founder of ${body.profile.company_name} is on a call with you. Stay in character, reply in 1-3 spoken sentences. Return JSON {"reply": string}.\n\n${transcript || "(call just started — you speak first)"}`, 0.8);
}

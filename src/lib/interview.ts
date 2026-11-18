// Shared, browser-safe shape of what the voice interview captured.
export type InterviewGoal = "customers" | "investors" | "hires";
export type Interview = {
  goal: InterviewGoal;
  website: string;
  pitch: string;
  buyer: { role: string; companyType: string; size: string };
  points: string[];
  proof: { value: string; label: string }[];
  ask: string;
  contact: string;
};
export type TranscriptLine = { role: "founder" | "agent"; text: string };

export const isGoal = (g: unknown): g is InterviewGoal => g === "customers" || g === "investors" || g === "hires";

const str = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Coerces model output into the interview schema: empty strings for unknowns, 2 to 4 points. */
export function normalizeInterview(raw: unknown, goal: InterviewGoal): Interview {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const b = (o.buyer && typeof o.buyer === "object" ? o.buyer : {}) as Record<string, unknown>;
  const points = (Array.isArray(o.points) ? o.points : []).map((p) => str(p, 160)).filter(Boolean).slice(0, 4);
  while (points.length < 2) points.push("");
  const proof = (Array.isArray(o.proof) ? o.proof : [])
    .map((p) => (p && typeof p === "object" ? p : {}) as Record<string, unknown>)
    .map((p) => ({ value: str(p.value, 24), label: str(p.label, 80) }))
    .filter((p) => p.value || p.label)
    .slice(0, 3);
  return {
    goal,
    website: str(o.website, 200),
    pitch: str(o.pitch, 400),
    buyer: { role: str(b.role, 120), companyType: str(b.companyType, 120), size: str(b.size, 80) },
    points,
    proof,
    ask: str(o.ask, 160),
    contact: str(o.contact, 200),
  };
}

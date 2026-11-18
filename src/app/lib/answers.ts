import type { Interview } from "@/lib/interview";

/** The interview answers in the shape the outreach server functions take (empty values dropped, lists capped). */
export function toAnswers(i: Interview | undefined | null) {
  if (!i) return null;
  return {
    goal: i.goal,
    website: i.website.slice(0, 200),
    pitch: i.pitch.slice(0, 400),
    buyer: { role: i.buyer.role.slice(0, 120), companyType: i.buyer.companyType.slice(0, 120), size: (i.buyer.size ?? "").slice(0, 80) },
    points: i.points.filter(Boolean).slice(0, 6),
    proof: i.proof.filter((p) => p.value || p.label).slice(0, 4),
    ask: i.ask.slice(0, 200),
  };
}

/** Plain-text signature from the sender's identity. */
export function signature(s: { name: string; role: string; linkedin: string } | undefined, site: string) {
  if (!s?.name) return "";
  return [s.name, [s.role, site].filter(Boolean).join(", "), s.linkedin].filter(Boolean).join("\n");
}

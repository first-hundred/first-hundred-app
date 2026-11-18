import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { spend } from "./limits.server";
import { makeColdopen, interviewToSalesProfile, filmStageLine, viewsLine, type SalesProfile } from "./fh/coldopen-client";
import type { CustomerProfile } from "./fh/types";

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

function salesProfile(p: CustomerProfile): SalesProfile {
  const pitch = p.pitch;
  if (!pitch) throw new Error("Add your pitch (offer, points, one proof number) on the profile page first.");
  const points = pitch.points.map((x) => x.trim()).filter((x) => x.length >= 3).slice(0, 6).map((x) => clip(x, 120));
  const proof = pitch.proof
    .filter((x) => x.value?.trim() && x.label?.trim().length >= 3)
    .slice(0, 3)
    .map((x) => ({ value: clip(x.value.trim(), 12), label: clip(x.label.trim(), 60) }));
  if (points.length < 2) throw new Error("Your pitch needs at least two points.");
  if (!proof.length) throw new Error("Your pitch needs one proof number (e.g. 140 / teams use it weekly).");
  const contact = pitch.contact?.trim() || pitch.book?.trim() || "";
  if (contact.length < 3) throw new Error("Add a contact email or booking link to your pitch.");
  return {
    preset: "sales",
    sender: { name: p.sender_name?.trim() || "Founder", company: p.company_name, role: "Founder" },
    offer: clip(pitch.offer.trim() || p.product_one_liner, 120),
    points,
    proof,
    cta: {
      line: clip(pitch.cta_line?.trim() || "Worth a 15-minute look?", 60),
      contact: clip(contact, 80),
      ...(pitch.book && /^https:\/\//.test(pitch.book) ? { book: pitch.book } : {}),
    },
  };
}

const interview = z.object({
  website: z.string(), pitch: z.string(),
  buyer: z.object({ role: z.string(), companyType: z.string(), size: z.string().optional() }),
  points: z.array(z.string()), proof: z.array(z.object({ value: z.string(), label: z.string() })),
  ask: z.string(), contact: z.string(),
});
const profile = z.object({
  company_name: z.string(), product_one_liner: z.string(), sender_name: z.string().optional(),
  pitch: z.object({ offer: z.string(), points: z.array(z.string()),
    proof: z.array(z.object({ value: z.string(), label: z.string() })),
    cta_line: z.string(), contact: z.string(), book: z.string().optional() }).optional(),
});
const idInput = z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/) });
async function quietly(action: (client: ReturnType<typeof makeColdopen>) => Promise<unknown>) {
  try {
    const apiKey = process.env.COLDOPEN_API_KEY;
    if (!apiKey?.trim()) return JSON.stringify({ disabled: true });
    return JSON.stringify(await action(makeColdopen({ apiKey, baseUrl: process.env.COLDOPEN_URL || "https://coldopen-nk8o.onrender.com" })) ?? {});
  } catch (e) { return JSON.stringify({ error: e instanceof Error ? e.message : String(e) }); }
}
export const startFilm = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ url: z.string().min(1), company: z.string(), interview: interview.optional(), profile: profile.optional(),
    sender: z.object({ name: z.string().max(80), email: z.string().max(120), role: z.string().max(80), linkedin: z.string().max(200) }).optional() }))
  .handler(async ({ data, context }) => {
    const over = await spend(context.userId, "film");
    if (over) return JSON.stringify({ error: over });
    return quietly(async (client) => {
    let sales: SalesProfile;
    try {
      if (!data.interview) throw new Error("Add your interview or pitch first.");
      // Fill what the voice interview no longer asks for, so a real visitor's film never fails on a missing field.
      const raw = data.interview;
      const pp = data.profile?.pitch;
      const site = raw.website || "";
      const points = [...raw.points, ...(pp?.points ?? [])].map((x) => x.trim()).filter((x) => x.length >= 3);
      const a = {
        ...raw,
        pitch: raw.pitch.trim().length >= 3 ? raw.pitch : (pp?.offer || data.profile?.product_one_liner || data.company),
        points: points.length >= 2 ? points : [...points, "Built for teams like yours", "Quick to set up"].slice(0, Math.max(2, points.length)),
        proof: raw.proof.some((x) => x.value.trim() && x.label.trim().length >= 3) ? raw.proof : (pp?.proof?.length ? pp.proof : [{ value: "30 s", label: "film made from your own website" }]),
        ask: raw.ask.trim().length >= 3 ? raw.ask : "Worth a 15-minute look?",
        contact: data.sender?.email.includes("@") ? data.sender.email.trim() : raw.contact.trim().length >= 3 ? raw.contact : (pp?.contact?.trim() || site || "First Hundred"),
      };
      const local = a.contact.includes("@") ? a.contact.split("@")[0].trim() : "";
      const name = data.sender?.name.trim() || (local ? local.charAt(0).toUpperCase() + local.slice(1) : "Founder");
      const company = new URL(/^https?:\/\//i.test(a.website) ? a.website : `https://${a.website}`).hostname.replace(/^www\./, "");
      sales = interviewToSalesProfile(a, { name, company, role: data.sender?.role.trim() || "Founder" });
    } catch (e) {
      if (!data.profile) throw e;
      sales = salesProfile(data.profile as CustomerProfile);
      if (data.sender?.name.trim()) sales = { ...sales, sender: { ...sales.sender, name: data.sender.name.trim(), role: data.sender.role.trim() || "Founder" } };
    }
    const url = /^https?:\/\//i.test(data.url) ? data.url : `https://${data.url}`;
    if (!/^https:\/\//i.test(url)) throw new Error("Use an https website.");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([url, sales])));
    const hash = Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
    const film = await client.createFilm({ url, profile: sales, ref: "fh-" + hash });
    return { id: film.id, status: film.status, stage: filmStageLine(film) };
  });
  });
export const filmState = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(idInput)
  .handler(({ data }) => quietly(async (client) => {
    const film = await client.getFilm(data.id);
    let checked: boolean | undefined;
    if (film.status === "succeeded") {
      try { checked = (await client.review(data.id)).ready === true; } catch { /* Review is optional. */ }
    }
    return { id: film.id, status: film.status, stage: filmStageLine(film), film: film.files?.film,
      poster: film.files?.poster, share: film.share, company: film.company, ...(checked !== undefined ? { checked } : {}) };
  }));
export const filmExtras = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(idInput)
  .handler(({ data }) => quietly(async (client) => {
    const [m, f] = await Promise.allSettled([client.messages(data.id), client.founders(data.id)]);
    const messages = m.status === "fulfilled" ? m.value : null;
    const first = f.status === "fulfilled" ? f.value.people?.[0] : undefined;
    return { subject: messages?.email?.subject ?? "", body: messages?.email?.body ?? "", linkedin: messages?.linkedin ?? "",
      to: first ? { name: String(first.name ?? ""), role: String(first.position ?? first.title ?? "") } : null };
  }));
export const filmViews = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ ids: z.array(idInput.shape.id).max(30) }))
  .handler(({ data }) => quietly(async (client) => Object.fromEntries(await Promise.all(data.ids.map(async (id) => [id, viewsLine((await client.views(id)).summary)])))));
export const setOutreach = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(idInput.extend({ stage: z.string() }))
  .handler(({ data }) => quietly(async (client) => client.setOutreach(data.id,
    data.stage === "Sent" ? "sent" : data.stage === "Replied" ? "replied" : data.stage === "Meeting" || data.stage === "Customer" ? "interview" : null)));

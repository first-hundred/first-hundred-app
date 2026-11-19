// Films are made by coldopen (github.com/tiwaker9404/coldopen): it reads the prospect's site,
// matches their brand, writes a grounded script and renders a 30-second film with a share page.
import type { CustomerProfile, Env } from "./types";

type Body =
  | { action: "create"; url: string; profile: CustomerProfile; ref?: string; format?: "square" | "landscape" | "portrait" }
  | { action: "status"; id: string };

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

function salesProfile(p: CustomerProfile) {
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

export async function run(body: Body, env: Env) {
  if (!env.COLDOPEN_API_KEY) return { disabled: true };
  const base = (env.COLDOPEN_URL || "https://coldopen-nk8o.onrender.com").replace(/\/$/, "");
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  if (env.COLDOPEN_API_KEY) headers.authorization = `Bearer ${env.COLDOPEN_API_KEY}`;
  const abs = (u?: string | null) => (u ? (u.startsWith("http") ? u : `${base}${u}`) : null);

  const call = async (path: string, init: RequestInit = {}) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch(`${base}${path}`, { ...init, headers, signal: ctrl.signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error?.message ?? data?.message ?? (typeof data?.error === "string" ? data.error : `coldopen ${res.status}`);
        throw new Error(res.status === 429 ? "Film limit reached for today. Add COLDOPEN_API_KEY for unlimited films." : msg);
      }
      return data;
    } finally {
      clearTimeout(t);
    }
  };

  // deno-lint-ignore no-explicit-any
  const shape = (f: any) => ({
    id: f.id as string,
    status: f.status as "queued" | "running" | "succeeded" | "failed" | "cancelled",
    progress: f.progress ?? null,
    error: f.error ?? null,
    company: f.company ?? null,
    durationSec: f.durationSec ?? null,
    share: abs(f.share),
    files: f.files
      ? { film: abs(f.files.film), poster: abs(f.files.poster), gif: abs(f.files.gif) }
      : null,
  });

  if (body.action === "status") {
    try {
      return shape(await call(`/v1/films/${encodeURIComponent(body.id)}`));
    } catch (e) {
      // coldopen's hosted app treats an unknown key as a new signed-out visitor, who can't see the film
      if (/film not found/i.test(String((e as Error).message)))
        throw new Error("coldopen can't find this film. Check COLDOPEN_API_KEY: it must be one of the API_KEYS values set on coldopen.");
      throw e;
    }
  }

  let url = body.url.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const film = await call("/v1/films", {
    method: "POST",
    body: JSON.stringify({ url, profile: salesProfile(body.profile), format: body.format ?? "square", ref: body.ref?.slice(0, 200) }),
    headers: { ...headers, "idempotency-key": `fh-${body.ref ?? url}-${Date.now()}` },
  });
  return shape(film);
}

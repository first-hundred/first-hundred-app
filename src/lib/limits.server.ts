import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Free use per signed-in user in any 24 hours. Keeps a public launch from draining the workspace's credits. */
export const LIMITS = { interview: 3, suggest: 10, film: 2, email: 30, ai: 60, recipient: 20 } as const;
export type UsageKind = keyof typeof LIMITS;

const NAMES: Record<UsageKind, string> = { interview: "interviews", suggest: "company suggestions", film: "films", email: "emails", ai: "AI requests", recipient: "recipient lookups" };

export function limitMessage(kind: UsageKind) {
  return `You've used today's free ${NAMES[kind]} (${LIMITS[kind]} a day). It resets 24 hours after your first one.`;
}

export const SITE_LIMITS = { interview: 100, suggest: 300, film: 60, email: 600, ai: 2000, recipient: 400 } as const;

const PAUSED = "First Hundred is paused for now. Try again later.";

/** Rolling 24 h check against the site-wide and per-user caps. `counted` = this call's row is already in the table. */
async function check(userId: string, kind: UsageKind, counted: boolean): Promise<string | null> {
  if ((process.env.FH_UNLIMITED_USER_IDS ?? "").split(",").map((id) => id.trim()).includes(userId)) return null;
  const since = new Date(Date.now() - 86400000).toISOString();
  for (const site of [true, false]) {
    let query = supabaseAdmin.from("usage").select("id", { count: "exact", head: true }).eq("kind", kind).gte("created_at", since);
    if (!site) query = query.eq("user_id", userId);
    const { count, error } = await query;
    if (error) return "We could not check your usage. Try again in a moment.";
    const cap = site ? SITE_LIMITS[kind] : LIMITS[kind];
    if ((count ?? 0) > (counted ? cap : cap - 1)) return site ? "First Hundred has reached today's limit for everyone. Try again tomorrow." : limitMessage(kind);
  }
  return null;
}

/** Checks rolling usage without recording a call. */
export async function peek(userId: string, kind: UsageKind): Promise<string | null> {
  if (process.env.FH_PAUSED === "1") return PAUSED;
  return check(userId, kind, false);
}

/**
 * Records the call first, then counts, and takes the record back when it's over a cap.
 * Recording first means parallel requests can't all slip under the limit together.
 * Written with the service role; users can only read their own rows.
 */
export async function spend(userId: string, kind: UsageKind): Promise<string | null> {
  if (process.env.FH_PAUSED === "1") return PAUSED;
  // Check first, so a user already over a cap never writes rows (no flooding the site-wide count).
  const before = await check(userId, kind, false);
  if (before) return before;
  const { data, error } = await supabaseAdmin.from("usage").insert({ user_id: userId, kind }).select("id").single();
  if (error || !data) return "We could not record your usage. Try again in a moment.";
  const over = await check(userId, kind, true);
  if (over) {
    // If this fails the user loses one use; that errs on the side of the owner's credits.
    const { error: undo } = await supabaseAdmin.from("usage").delete().eq("id", data.id);
    if (undo) console.error("usage rollback failed", undo);
  }
  return over;
}

/** The user id for a Supabase access token, or null when it's missing or invalid. */
export async function userFromToken(token: string | null | undefined): Promise<string | null> {
  if (!token || token.split(".").length !== 3) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    return error ? null : data.user?.id ?? null;
  } catch {
    return null;
  }
}

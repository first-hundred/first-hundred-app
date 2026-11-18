import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Free use per signed-in user in any 24 hours. Keeps a public launch from draining the workspace's credits. */
export const LIMITS = { interview: 3, suggest: 10, film: 3, email: 30, ai: 60 } as const;
export type UsageKind = keyof typeof LIMITS;

const NAMES: Record<UsageKind, string> = { interview: "interviews", suggest: "company suggestions", film: "films", email: "emails", ai: "AI requests" };

export function limitMessage(kind: UsageKind) {
  return `You've used today's free ${NAMES[kind]} (${LIMITS[kind]} a day). It resets 24 hours after your first one.`;
}

/**
 * Counts this user's use of `kind` in the last 24 hours and records one more if they're under the limit.
 * Returns an error message when they're over it. Uses the service role so a user can't reset their own count.
 */
export async function spend(userId: string, kind: UsageKind): Promise<string | null> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from("usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind)
    .gte("created_at", since);
  if (error) {
    console.error("usage count failed", error);
    return "We could not check your usage. Try again in a moment.";
  }
  if ((count ?? 0) >= LIMITS[kind]) return limitMessage(kind);
  const { error: insertError } = await supabaseAdmin.from("usage").insert({ user_id: userId, kind });
  if (insertError) console.error("usage insert failed", insertError);
  return null;
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

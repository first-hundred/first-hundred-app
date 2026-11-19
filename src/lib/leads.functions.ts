import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getEventLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ url: z.string().min(1).max(500), profile: z.unknown() }))
  .handler(async ({ data, context }) => {
    const { spend } = await import("./limits.server");
    const error = await spend(context.userId, "ai");
    if (error) return JSON.stringify({ error });
    const { rankEvent } = await import("./fh/leads");
    try {
      return JSON.stringify(await rankEvent(data.url, data.profile ?? null));
    } catch (e) {
      return JSON.stringify({ error: e instanceof Error ? e.message : String(e) });
    }
  });

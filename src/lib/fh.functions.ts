import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const NAMES = ["analyze-site", "search-signals", "score-signals", "draft-message", "rehearse-call", "event-signals", "make-film", "warm-paths"] as const;

export const callFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ name: z.enum(NAMES), body: z.unknown() }))
  .handler(async ({ data, context }) => {
    const mods = {
      "analyze-site": () => import("./fh/analyze"),
      "search-signals": () => import("./fh/signals"),
      "score-signals": () => import("./fh/score"),
      "draft-message": () => import("./fh/draft"),
      "rehearse-call": () => import("./fh/rehearse"),
      "event-signals": () => import("./fh/events"),
      "make-film": () => import("./fh/film"),
      "warm-paths": () => import("./fh/warm"),
    } as const;
    // A new film counts as a film; every other AI call counts as one AI request. Polling a film's status is free.
    const body = (data.body ?? {}) as { action?: string };
    const kind = data.name === "make-film" ? (body.action === "create" ? "film" : null) : "ai";
    if (kind) {
      const { spend } = await import("./limits.server");
      const over = await spend(context.userId, kind);
      if (over) return JSON.stringify({ error: over });
    }
    const env = { COLDOPEN_URL: process.env.COLDOPEN_URL, COLDOPEN_API_KEY: process.env.COLDOPEN_API_KEY };
    try {
      const mod = (await mods[data.name]()) as { run: (b: unknown, e: unknown) => Promise<unknown> };
      const out = await mod.run(data.body ?? {}, env);
      return JSON.stringify(out ?? {});
    } catch (e) {
      return JSON.stringify({ error: e instanceof Error ? e.message : String(e) });
    }
  });

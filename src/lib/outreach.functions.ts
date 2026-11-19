import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { spend } from "./limits.server";

const answers = z.object({
  goal: z.enum(["customers", "investors", "hires"]),
  website: z.string().max(200),
  pitch: z.string().max(400),
  buyer: z.object({ role: z.string().max(120), companyType: z.string().max(120), size: z.string().max(80).optional().default("") }),
  points: z.array(z.string().max(200)).max(6),
  proof: z.array(z.object({ value: z.string().max(40), label: z.string().max(120) })).max(4),
  ask: z.string().max(200),
});
const sender = z.object({ name: z.string().min(1).max(80), email: z.string().max(120), role: z.string().max(80), linkedin: z.string().max(200) });
const lead = z.object({ company: z.string().max(120), url: z.string().max(300), why: z.string().max(300) });
const profile = z.record(z.string(), z.unknown()).nullable().optional();

const fail = (e: unknown) => JSON.stringify({ error: e instanceof Error ? e.message : String(e) });

/** Companies that fit the founder's buyer, from their interview and site profile. */
export const suggestLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ answers: answers.nullable().optional(), profile, exclude: z.array(z.string().max(200)).max(50).optional() }))
  .handler(async ({ data, context }) => {
    try {
      const over = await spend(context.userId, "suggest");
      if (over) return JSON.stringify({ error: over });
      const { suggestCompanies } = await import("./fh/outreach");
      return JSON.stringify({ companies: await suggestCompanies(data) });
    } catch (e) { return fail(e); }
  });

/** The person to write to at a company, with an address (found by Hunter when configured, otherwise a labelled guess). */
export const getRecipient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ url: z.string().min(1).max(300), name: z.string().max(120).optional(), role: z.string().max(120).optional() }))
  .handler(async ({ data, context }) => {
    if (process.env.HUNTER_API_KEY) {
      const error = await spend(context.userId, "recipient");
      if (error) return JSON.stringify({ error });
    }
    try {
      const { findRecipient } = await import("./fh/outreach");
      return JSON.stringify(await findRecipient(data, process.env.HUNTER_API_KEY));
    } catch (e) { return fail(e); }
  });

/** The first email, written from the founder's interview answers and signed with their identity. */
export const draftEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    sender, answers: answers.nullable().optional(), profile, lead,
    recipient: z.object({ name: z.string().max(120), role: z.string().max(120) }).nullable().optional(),
    share: z.string().max(300).optional(),
  }))
  .handler(async ({ data, context }) => {
    try {
      const over = await spend(context.userId, "email");
      if (over) return JSON.stringify({ error: over });
      const { writeEmail } = await import("./fh/outreach");
      return JSON.stringify(await writeEmail(data));
    } catch (e) { return fail(e); }
  });

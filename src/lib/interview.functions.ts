import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeInterview } from "./interview";

const Input = z.object({
  goal: z.enum(["customers", "investors", "hires"]),
  transcript: z.array(z.object({ role: z.enum(["founder", "agent"]), text: z.string().max(4000) })).max(400),
});

const SCHEMA = `{"website": "", "pitch": "", "buyer": {"role": "", "companyType": "", "size": ""}, "points": [""], "proof": [{"value": "", "label": ""}], "ask": "", "contact": ""}`;

/** Turns the interview transcript into the structured answers, using Lovable AI. */
export const extractInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    const text = data.transcript.map((l) => `${l.role === "founder" ? "Founder" : "Interviewer"}: ${l.text}`).join("\n");
    if (!text.trim()) return { interview: normalizeInterview({}, data.goal), error: null as string | null };
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions:
          `Extract the founder's answers from a short interview transcript. The founder's goal is: ${data.goal}. ` +
          `Return only JSON with exactly this schema: ${SCHEMA}. Use empty strings for anything unknown. ` +
          `"points" must have 2 to 4 items: what matters most to the buyer, or the strongest reasons to say yes. ` +
          `"proof" is only real numbers or facts the founder said; use an empty array if none. ` +
          `For investors, "buyer" describes the kind of investor; for hires, it describes the role and teams. ` +
          `Write the website as a bare domain if possible. Never invent facts. Typed answers count like spoken ones.`,
        input: text,
        text: { format: { type: "json_object" } },
        reasoning: { effort: "low" },
      });
      let out = "";
      for (const item of res.output ?? []) {
        if (item.type === "message") for (const c of item.content) if (c.type === "output_text") out += c.text;
      }
      let parsed: unknown = {};
      try { parsed = JSON.parse(out); } catch { const m = out.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); }
      return { interview: normalizeInterview(parsed, data.goal), error: null as string | null };
    } catch (e) {
      console.error("extractInterview failed", e);
      const msg = e instanceof GatewayError && e.httpStatus === 429 ? "The AI is busy. Fill in the cards yourself, or try again." : "We could not read the interview. Fill in the cards yourself.";
      return { interview: normalizeInterview({}, data.goal), error: msg as string | null };
    }
  });

/** Called before the voice call opens: counts one interview against the user's daily limit. */
export const startInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { spend } = await import("./limits.server");
    return { error: await spend(context.userId, "interview") };
  });

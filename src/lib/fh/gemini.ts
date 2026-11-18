import { generateResponse, GatewayError } from "@lovable.dev/ai-gateway";
import type { Env } from "./types";

function parseJSON<T>(text: string): T | null {
  try { return JSON.parse(text) as T; } catch { /* fall through */ }
  const m = text.match(/[\[{][\s\S]*[\]}]/);
  if (m) { try { return JSON.parse(m[0]) as T; } catch { /* fall through */ } }
  return null;
}

/** Calls the Lovable AI Gateway and returns parsed JSON. Signature kept from the original Gemini helper. */
export async function geminiJSON<T>(_env: Env, prompt: string, _temperature = 0.4): Promise<T> {
  try {
    const res = await generateResponse({
      model: "openai/gpt-6-astra",
      input: `${prompt}\n\nRespond with a single valid JSON value only.`,
      text: { format: { type: "json_object" } },
      reasoning: { effort: "low" },
      max_output_tokens: 6000,
    });
    let text = "";
    for (const item of res.output ?? []) {
      if (item.type === "message") {
        for (const c of item.content) if (c.type === "output_text") text += c.text;
      }
    }
    const out = parseJSON<T>(text);
    if (out === null) throw new Error("The AI returned malformed JSON. Try again.");
    return out;
  } catch (e) {
    if (e instanceof GatewayError) {
      if (e.httpStatus === 429) throw new Error("The AI is busy right now. Try again in a moment.");
      if (e.httpStatus === 402) throw new Error("AI credits have run out for this workspace.");
      throw new Error(`AI request failed: ${e.message}`);
    }
    throw e;
  }
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

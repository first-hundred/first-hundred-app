import { geminiJSON } from "./gemini";
import type { Candidate, CustomerProfile, Env } from "./types";

export async function run(
  body: {
    profile: CustomerProfile;
    prospect: Candidate & { reason?: string; why_now?: string };
    variant?: "helpful" | "direct";
    filmUrl?: string;
    /** intro: ask a mutual connection to introduce the prospect. referral: ask a new customer for intros. */
    mode?: "first" | "intro" | "referral" | "quote";
    via?: { name: string; position?: string; company?: string };
  },
  env: Env,
) {
  const { profile, prospect } = body;
  const variant = body.variant ?? "helpful";
  if (body.mode === "intro" && body.via) {
    const prompt = `Write a short LinkedIn message from a founder to a connection, asking for an intro.
FOUNDER: ${profile.sender_name || "the founder"} of ${profile.company_name} (${profile.product_one_liner})
CONNECTION: ${body.via.name}${body.via.position ? `, ${body.via.position}` : ""}${body.via.company ? ` at ${body.via.company}` : ""}
WANTS AN INTRO TO: ${prospect.author}${prospect.company ? ` at ${prospect.company}` : ""} — ${prospect.excerpt.slice(0, 200)}
WHY: ${prospect.reason ?? ""}
Rules: friendly and specific; say exactly who and why in one sentence; make it easy to say yes or no; include a 2-sentence forwardable blurb they can paste as-is, set apart under "Blurb you can forward:"${body.filmUrl ? `; mention the blurb can include this 30-second film made for ${prospect.company ?? "them"}: ${body.filmUrl}` : ""}. Under 110 words total. No hype words, no emojis. Sign with the founder's first name.
Return JSON: {"subject": string, "message": string}`;
    return await geminiJSON<{ subject: string; message: string }>(env, prompt, 0.7);
  }
  const hires = profile.goal === "hires";
  if (body.mode === "quote") {
    const prompt = `Write a short note from a founder to a ${hires ? "new hire who just joined" : "brand-new customer"}, asking for one sentence the founder can quote.
FOUNDER: ${profile.sender_name || "the founder"} of ${profile.company_name} (${profile.product_one_liner})
THEM: ${prospect.author}${prospect.company ? ` at ${prospect.company}` : ""}
Rules: thank them in one specific sentence; ask what ${hires ? "made them say yes" : "changed for them since they started"}, in one sentence and in their own words; ask if it's fine to quote it with their name and company in short films sent to ${hires ? "candidates" : "people like them"}; give one example of the shape (a result or a before/after, under 15 words) that they can edit; under 80 words; warm, plain, no hype, no emojis. Sign with the founder's first name.
Return JSON: {"subject": string, "message": string}`;
    return await geminiJSON<{ subject: string; message: string }>(env, prompt, 0.7);
  }
  if (body.mode === "referral") {
    const prompt = `Write a short thank-you from a founder to a brand-new ${hires ? "hire (they just accepted the offer)" : "customer"} that asks for two intros.
FOUNDER: ${profile.sender_name || "the founder"} of ${profile.company_name} (${profile.product_one_liner})
CUSTOMER: ${prospect.author}${prospect.company ? ` at ${prospect.company}` : ""}
IDEAL NEXT CUSTOMERS: ${profile.ideal_customer.role} at ${profile.ideal_customer.company_type}
Rules: thank them in one specific sentence; ask ${hires ? '"who are two people you\'d love to work with again?"' : `"who are two people you know who deal with ${profile.top_pains[0] ?? "this"}?"`}; offer to send a forwardable blurb; under 80 words; warm, plain, no hype, no emojis. Sign with the founder's first name.
Return JSON: {"subject": string, "message": string}`;
    return await geminiJSON<{ subject: string; message: string }>(env, prompt, 0.7);
  }
  const investors = profile.goal === "investors";
  const isEvent = prospect.source === "event";
  const channel = isEvent ? "LinkedIn connection note or message before/at the event" : prospect.source === "reddit" ? "Reddit DM" : "reply or email";
  const context = isEvent
    ? `THEM: ${prospect.author} — ${prospect.excerpt}\nEVENT: ${prospect.community} (${prospect.date?.slice(0, 10)}). Both are attending. ${prospect.why_now ? `Timing: ${prospect.why_now}.` : ""}`
    : `THEIR POST (${prospect.community}, ${prospect.date?.slice(0, 10)}): "${prospect.excerpt}"`;
  const ask = isEvent
    ? 'ask for 5 minutes at the event (e.g. "could I grab 5 minutes after the demos?")'
    : hires
    ? 'ask for a 20-minute chat about the role, no pressure'
    : investors
    ? 'ask for a 20-min intro call or permission to send the deck'
    : 'one small, clear ask (e.g. "want me to set it up for your case?" or "open to a 15-min call this week?")';
  const prompt = `Write a first message from a founder to ${hires ? "someone they would like to hire" : investors ? "a potential investor" : "a potential customer"}. It will be sent as a ${channel}.

FOUNDER: ${profile.sender_name || "the founder"} of ${profile.company_name}
PRODUCT: ${profile.product_one_liner}
POSITIONING: ${profile.positioning_line}
${context}
WHY THEY FIT: ${prospect.reason ?? ""}

Style: ${variant === "direct" ? "direct and confident; name the company and what it does in the second sentence" : hires ? "lead with what they would build and own, tied to their background, then the company" : investors ? "lead with one sharp proof point or insight relevant to their thesis, then the company" : "helpful first; give one genuinely useful tip about their problem before mentioning the product"}.
Hard rules:
- Open with one specific detail about THEM (${isEvent ? "their role or company and the event" : "from their post"}), not "I saw your post" or "Hope you're well".
- No hype words (revolutionary, game-changing, seamless, leverage, excited to). No emojis.
${body.filmUrl ? `- The founder made them a 30-second film about ${prospect.company ?? "their company"}, in their own brand. Mention it in a few plain words and include this link on its own line: ${body.filmUrl}\n` : ""}- End with this ask: ${ask}.
- Under ${isEvent ? 70 : 90} words. Plain, human tone, like a real founder typing. Sign with the founder's first name.

Return JSON: {"subject": string (short, about them, for email use), "message": string}`;
  return await geminiJSON<{ subject: string; message: string }>(env, prompt, 0.8);
}

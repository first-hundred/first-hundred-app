> **Cut on 17 Nov 2026** (Jakob: "call rehersal i think shoudl be out"). Kept for reference. See docs/PLAN-hackathon.md.

# Spec: Call rehearsal (owner: Jakob)

## Why
After a prospect replies, the founder has to run a discovery call. Most founders pitch instead of listening. Call rehearsal lets them practice out loud with an AI playing *that exact prospect* (built from what the person actually posted), then grades the call the way a GTM coach would. Judges include a customer-discovery advisor, so this is the demo's "wow" moment.

## User flow
1. In the prospect drawer, the founder clicks **Rehearse the call** (button already wired; it renders `<RehearsalPanel />`).
2. Panel opens full-screen: prospect name, their post, a short brief ("They're frustrated with X; they asked about Y").
3. Founder clicks **Start call**. The prospect speaks the first line (e.g. "Hey, saw your message — what's this about?").
4. Turn-taking by voice: browser `SpeechRecognition` (webkitSpeechRecognition in Chrome) captures the founder; the AI prospect replies in character via `speechSynthesis`. Live transcript shown as chat bubbles. A text box fallback is always available (for noisy venues / no mic permission).
5. **End call** (or after ~8 founder turns) → scorecard:
   - Overall score 0–100
   - Talk ratio (founder words vs prospect words; computed client-side)
   - 3 criteria scored 1–5 with one-line evidence quoted from the transcript: *Asked about their real problem*, *Listened more than pitched*, *Ended with a clear next step*
   - "Best question you asked" and "Question you should have asked"
   - Button **Practice again**

## Persona rules (prompt)
- The prospect is the real person behind the post: same pain, same context, realistic and a bit busy/skeptical. Never breaks character, never says they're an AI.
- Short spoken replies (1–3 sentences). Reveals deeper pain only when asked good open questions. Pushes back on early pitching ("sounds like a sales pitch…").
- If the founder asks for a next step convincingly, agrees to one.

## Contract (do not change signatures — other code depends on them)

### Backend: `supabase/functions/_shared/rehearse.ts`
```ts
export async function run(
  body: {
    mode: "turn" | "score";
    profile: CustomerProfile;          // from ./types.ts
    prospect: { author: string; excerpt: string; community?: string; reason?: string };
    goal: "customers" | "investors";   // investors: prospect is an investor being pitched
    history: { role: "founder" | "prospect"; text: string }[];
  },
  env: Env,
): Promise<
  | { reply: string; end?: boolean }                        // mode "turn"
  | { score: number; criteria: { name: string; score: number; evidence: string }[];
      best_question: string; missed_question: string; summary: string }  // mode "score"
>
```
Use `geminiJSON(env, prompt)` from `./gemini.ts`. Already registered as function `rehearse-call` in `vite.config.ts` and `supabase/functions/rehearse-call/index.ts`. Client: `api.rehearse(body)` in `src/lib/api.ts` (already added).

### Frontend: `src/features/rehearsal/RehearsalPanel.tsx`
```tsx
export function RehearsalPanel(props: {
  prospect: Prospect; profile: CustomerProfile; goal: "customers" | "investors"; onClose: () => void;
}): JSX.Element
```
A stub exists — replace its body. Put helpers (speech hooks etc.) in the same folder.

## Quality bar
- Works in Chrome with mic; degrades to typing elsewhere. Show a clear mic state (listening / thinking / speaking).
- Never two voices at once: cancel `speechSynthesis` when the founder starts talking.
- Latency: show "thinking…" immediately; keep prompts small (send last ~10 turns).
- Matches existing styling (`.card`, `.btn-primary`, brand teal). No new dependencies unless essential.
- `npm run typecheck && npm run build` pass before pushing. Push to a branch `jakob/rehearsal` and open a PR, or push to main if Ashwin says so.

## Local run
`cp .env.example .env` (add a free Gemini key from aistudio.google.com/apikey) → `npm install` → `npm run dev` → http://localhost:8080. Run a search (or load a snapshot), open any prospect, click **Rehearse the call**.

import { useEffect, useState } from "react";

export const TICKER_LINES = {
  interview: ["Listening for your buyer", "Noting what makes you different", "Looking for proof in what you said", "Shaping your pitch"],
  leads: ["Reading your interview", "Doing homework on each company", "Matching buyers to your pitch", "Ranking who is most likely to say yes", "Checking every company website loads"],
  films: ["Reading their homepage", "Aligning to their brand colours", "Choosing fonts that match their site", "Writing a script from facts on their site", "Checking every number against the source", "Prettifying the film", "Rendering 30 seconds in their brand"],
  send: ["Drafting a message in your voice", "Keeping it under 90 words", "Adding the film link"],
} as const;

export type TickerPhase = keyof typeof TICKER_LINES;

/** Fade in (~0.4s), hold ~1.8s, fade out (~0.4s). */
export const TICKER_CYCLE_MS = 2600;

/** Small grey status line, fixed bottom-center; render it only while waiting. */
export function Ticker({ phase, inline = false }: { phase: TickerPhase; inline?: boolean }) {
  const lines = TICKER_LINES[phase];
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    const t = setInterval(() => setI((n) => (n + 1) % lines.length), TICKER_CYCLE_MS);
    return () => clearInterval(t);
  }, [phase, lines.length]);
  return (
    <div
      role="status"
      aria-live="polite"
      className={inline ? "text-center" : "pointer-events-none fixed inset-x-0 bottom-4 z-30 text-center"}
    >
      <span key={`${phase}-${i}`} className="ticker-line inline-block text-[12px] text-ink/60" style={{ ["--tick-ms" as string]: `${TICKER_CYCLE_MS}ms` }}>
        {lines[i]}
      </span>
    </div>
  );
}

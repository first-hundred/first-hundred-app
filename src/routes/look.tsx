import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Ticker, TICKER_LINES, TICKER_CYCLE_MS, type TickerPhase } from "@/components/look/Ticker";

const PHASES = Object.keys(TICKER_LINES) as TickerPhase[];

export const Route = createFileRoute("/look")({
  head: () => ({
    meta: [
      { title: "Look — First Hundred" },
      { name: "description", content: "Review the First Hundred look: background, type, buttons, panels and status ticker." },
      { property: "og:title", content: "Look — First Hundred" },
      { property: "og:description", content: "Review the First Hundred look: background, type, buttons, panels and status ticker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LookPage,
});

function LookPage() {
  const [p, setP] = useState(0);
  const phase = PHASES[p];
  useEffect(() => {
    const t = setTimeout(() => setP((n) => (n + 1) % PHASES.length), TICKER_LINES[phase].length * TICKER_CYCLE_MS);
    return () => clearTimeout(t);
  }, [phase]);
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-12 px-6 py-24">
      <div className="space-y-5">
        <h1 className="display text-5xl sm:text-6xl">Your first hundred customers, one calm step at a time.</h1>
        <p className="max-w-xl text-lg text-grain">Find the people already asking for what you built, start the conversation, rehearse the call.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="btn-primary">Get started</button>
        <button className="btn-secondary">See how it works</button>
      </div>
      <section className="panel space-y-3 p-8">
        <h2 className="text-xl font-semibold">A translucent panel</h2>
        <p className="text-grain">Soft blur, hairline border, no heavy shadow. Content stays crisp on the moving background.</p>
        <p className="text-sm text-grain">Ticker phase: <span className="font-medium text-ink">{phase}</span></p>
      </section>
      <Ticker phase={phase} />
    </main>
  );
}

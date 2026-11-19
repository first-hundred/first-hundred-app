import { RequireAuthOrDemo } from "@/app/lib/gate";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/app/lib/store";
import type { Stage } from "@/app/lib/types";
import { filmViews, setOutreach } from "@/lib/coldopen.functions";
import { useDemoSeed } from "@/app/lib/useDemoSeed";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline — First Hundred" },
      { name: "description", content: "Drag conversations from sent to customer and watch the count move toward 100." },
      { property: "og:title", content: "Pipeline — First Hundred" },
      { property: "og:description", content: "Drag conversations from sent to customer and watch the count move toward 100." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GatedPipeline,
});

const COLUMNS: { stage: Stage; label: string }[] = [
  { stage: "contacted", label: "Sent" },
  { stage: "replied", label: "Replied" },
  { stage: "call", label: "Meeting" },
  { stage: "customer", label: "Customer" },
];

function Confetti({ burst }: { burst: number }) {
  const [dots, setDots] = useState<{ id: number; dx: number; dy: number; x: number }[]>([]);
  useEffect(() => {
    if (!burst) return;
    const next = Array.from({ length: 18 }, (_, i) => ({
      id: burst * 100 + i,
      x: 20 + Math.random() * 60,
      dx: (Math.random() - 0.5) * 160,
      dy: 30 + Math.random() * 90,
    }));
    setDots(next);
    const t = setTimeout(() => setDots([]), 1000);
    return () => clearTimeout(t);
  }, [burst]);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-0" aria-hidden>
      {dots.map((d) => (
        <span key={d.id} className="dot-burst absolute top-4 h-1.5 w-1.5 rounded-full bg-ink"
          style={{ left: `${d.x}%`, ["--dx" as string]: `${d.dx}px`, ["--dy" as string]: `${d.dy}px` }} />
      ))}
    </div>
  );
}

function PipelinePage() {
  useDemoSeed();
  const { ws, setStage, stats, isDemo } = useWorkspace();
  const [over, setOver] = useState<Stage | null>(null);
  const [burst, setBurst] = useState(0);
  const prev = useRef(stats.customers);
  useEffect(() => {
    if (stats.customers > prev.current) setBurst((b) => b + 1);
    prev.current = stats.customers;
  }, [stats.customers]);
  const [lines, setLines] = useState<Record<string, string>>({});
  const [pulsing, setPulsing] = useState<string[]>([]);
  const previousLines = useRef<Record<string, string>>({});
  const filmIds = JSON.stringify([...new Set(ws.prospects.map((p) => p.film?.id).filter((id): id is string => Boolean(id)))]);
  useEffect(() => {
    const ids: string[] = JSON.parse(filmIds);
    if (!ids.length || isDemo) return;
    let active = true;
    let pulseTimer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const next: Record<string, string> = {};
        for (let i = 0; i < ids.length; i += 30) {
          const result = JSON.parse(await filmViews({ data: { ids: ids.slice(i, i + 30) } }));
          if (!active) return;
          for (const id of ids.slice(i, i + 30)) {
            if (typeof result[id] === "string") next[id] = result[id];
          }
        }
        if (!active) return;
        const changed = Object.keys(next).filter((id) => previousLines.current[id] !== next[id]);
        previousLines.current = { ...previousLines.current, ...next };
        setLines(previousLines.current);
        if (changed.length) {
          setPulsing(changed);
          clearTimeout(pulseTimer);
          pulseTimer = setTimeout(() => setPulsing([]), 1500);
        }
      } catch { /* Views are optional. */ }
    };
    void poll();
    const timer = setInterval(() => void poll(), 10000);
    return () => { active = false; clearInterval(timer); clearTimeout(pulseTimer); };
  }, [filmIds, isDemo]);
  const pct = Math.min(100, stats.customers);

  return (
    <div className="relative min-h-screen text-ink font-sans mx-auto max-w-6xl px-4 py-12">
      <Confetti burst={burst} />
      <div className="px-4 py-5">
        <div className="flex items-baseline justify-between gap-6">
          <div className="text-4xl font-semibold tabular-nums tracking-normal">{stats.customers} / 100</div>
          <Link to="/road" className="text-sm text-grain hover:text-ink">Road to 100 →</Link>
        </div>
        <div className="mt-4 h-1 w-full bg-rule">
          <div className="h-full bg-ink transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <main className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map(({ stage, label }) => {
          const items = ws.prospects.filter((p) => p.stage === stage);
          return (
            <section key={stage}
              onDragOver={(e) => { e.preventDefault(); setOver(stage); }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                setStage(id, stage);
                setOver(null);
                const filmId = ws.prospects.find((p) => p.id === id)?.film?.id;
                if (filmId && !isDemo) void setOutreach({ data: { id: filmId, stage: label } }).catch(() => {});
              }}
              className={`min-h-[18vh] lg:min-h-[65vh] px-4 py-5 transition-colors ${over === stage ? "bg-rule" : ""}`}>
              <h2 className="mb-4 text-xs text-grain">{label} <span className="tabular-nums">{items.length}</span></h2>
              <ul className="space-y-2">
                {items.map((p) => (
                  <li key={p.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                    className={`panel cursor-grab px-3 py-3 text-sm backdrop-blur active:cursor-grabbing ${p.film?.id && pulsing.includes(p.film.id) ? "animate-pulse [animation-duration:1.5s] [animation-iteration-count:1]" : ""}`}>
                    <div className="truncate font-medium">{p.company || p.author}</div>
                    {p.author && p.author !== p.company && <div className="truncate text-xs text-ink/70">{p.author}</div>}
                    {(p.film?.id && lines[p.film.id]) || p.why_now ? <div className="mt-1 truncate text-xs text-grain">{(p.film?.id && lines[p.film.id]) || p.why_now}</div> : null}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
    </div>
  );
}

function GatedPipeline() {
  return <RequireAuthOrDemo><PipelinePage /></RequireAuthOrDemo>;
}

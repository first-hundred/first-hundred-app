import { createFileRoute } from "@tanstack/react-router";
import { useWorkspace } from "@/app/lib/store";
import { roadPlan } from "@/app/lib/road";
import { useDemoSeed } from "@/app/lib/useDemoSeed";

export const Route = createFileRoute("/road")({
  head: () => ({
    meta: [
      { title: "Road to 100 — First Hundred" },
      { name: "description", content: "How many films a day it takes to reach 100 customers, and by when." },
      { property: "og:title", content: "Road to 100 — First Hundred" },
      { property: "og:description", content: "How many films a day it takes to reach 100 customers, and by when." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoadPage,
});

function RoadPage() {
  useDemoSeed();
  const { stats } = useWorkspace();
  const plan = roadPlan({ customers: stats.customers, contacted: stats.contacted, replyRate: stats.replyRate });
  const date = plan.finish.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="relative flex min-h-screen flex-col text-ink font-sans mx-auto max-w-4xl">
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <div className="text-7xl sm:text-9xl lg:text-[160px] font-semibold leading-none tracking-normal tabular-nums">{stats.customers}/100</div>
        <p className="mt-8 text-lg text-grain">{plan.perDay} films a day to reach 100 by {date}</p>
        <p className="mt-1 text-lg text-grain">{stats.contacted} films sent so far</p>
        <div className="mt-10 h-px w-full bg-rule">
          <div className="h-full bg-ink transition-[width] duration-700" style={{ width: `${Math.min(100, stats.customers)}%` }} />
        </div>
      </main>
    </div>
  );
}

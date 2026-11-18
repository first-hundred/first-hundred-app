import { Outlet } from "@tanstack/react-router";
import { NavLink, useNavigate } from "../lib/router-compat";
import { Download, RotateCcw, Upload } from "lucide-react";
import { useRef } from "react";
import { useWorkspace } from "../lib/store";
import { GOALS, PROFILE_TAB, goalOf } from "../lib/goal";

export function ProgressBar() {
  const { stats, ws } = useWorkspace();
  const g = GOALS[goalOf(ws.profile?.goal)];
  const pct = Math.min(100, (stats.customers / g.target) * 100);
  return (
    <div className="border-b border-ink bg-ink text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:gap-x-8 sm:px-6">
        <div className="flex items-baseline gap-2">
          <span className="tc text-3xl text-stock">{stats.customers}</span>
          <span className="text-sm font-medium text-white/60">/ {g.target} {g.unit}</span>
        </div>
        <div className="h-2 min-w-[160px] flex-1 overflow-hidden rounded-sm bg-white/15">
          <div className="h-full bg-stock transition-all duration-700" style={{ width: `${Math.max(pct, stats.customers ? 2 : 0)}%` }} />
        </div>
        <Stat label="prospects" value={ws.prospects.length} />
        <Stat label="films" value={stats.films} />
        <Stat label="hot" value={stats.hot} />
        <Stat label="contacted" value={stats.contacted} />
        <Stat label="reply rate" value={`${stats.replyRate}%`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-sm">
      <span className="tc text-base">{value}</span>{" "}
      <span className="text-white/60">{label}</span>
    </div>
  );
}

export default function Layout() {
  const { ws, reset, exportJSON, importJSON } = useWorkspace();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const tab = ({ isActive }: { isActive: boolean }) =>
    `shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition ${isActive ? "bg-stock text-ink" : "text-grain hover:text-ink"}`;

  const download = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `first-hundred-${(ws.profile?.company_name ?? "workspace").toLowerCase().replace(/\W+/g, "-")}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-rule bg-glass backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:flex-nowrap">
          <button onClick={() => nav("/")} className="display shrink-0 text-xl uppercase">First Hundred</button>
          {ws.profile && <span className="hidden truncate text-sm text-grain xl:inline">for {ws.profile.company_name} · films by coldopen</span>}
          <nav className="order-last -mx-1 flex w-full items-center gap-1 overflow-x-auto px-1 lg:order-none lg:ml-auto lg:w-auto lg:overflow-visible">
            <NavLink to="/profile" className={tab}>{PROFILE_TAB[goalOf(ws.profile?.goal)]}</NavLink>
            <NavLink to="/network" className={tab}>Warm paths</NavLink>
            <NavLink to="/prospects" className={tab}>Prospects</NavLink>
            <NavLink to="/today" className={tab}>Today's 10</NavLink>
            <NavLink to="/pipeline" className={tab}>Pipeline</NavLink>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1 border-l border-rule pl-3 lg:ml-0">
            <button title="Save snapshot" className="btn-ghost px-2" onClick={download}><Download className="h-4 w-4" /></button>
            <button title="Load snapshot" className="btn-ghost px-2" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /></button>
            <button title="Start over" className="btn-ghost px-2" onClick={() => { if (confirm("Start over? This clears the workspace.")) { reset(); nav("/"); } }}><RotateCcw className="h-4 w-4" /></button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              importJSON(await f.text()); nav("/prospects");
            }} />
          </div>
        </div>
        <ProgressBar />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><Outlet /></main>
    </div>
  );
}

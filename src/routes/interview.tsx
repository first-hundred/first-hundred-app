import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import InterviewScreen from "@/app/flow/InterviewScreen";
import { useWorkspace } from "@/app/lib/store";
import { api } from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { SignIn, useAuth } from "@/app/lib/auth";
import { SenderFields, useSender } from "@/app/flow/SenderFields";
import { startInterview } from "@/lib/interview.functions";

export const Route = createFileRoute("/interview")({
  validateSearch: zodValidator(z.object({ goal: fallback(z.string(), "customers").default("customers") })),
  head: () => ({
    meta: [
      { title: "Voice interview — First Hundred" },
      { name: "description", content: "A 60-second voice interview about your startup, your pitch and who you want to reach." },
      { property: "og:title", content: "Voice interview — First Hundred" },
      { property: "og:description", content: "A 60-second voice interview about your startup, your pitch and who you want to reach." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InterviewRoute,
});

function InterviewRoute() {
  const { goal } = Route.useSearch();
  const g = "customers" as const;
  const onlyCustomers = goal === "investors" || goal === "hires";
  const { ws, set } = useWorkspace();
  const [site, setSite] = useState(ws.url ?? "");
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { session, ready: authReady } = useAuth();
  const { ready: senderReady } = useSender(session?.user.email ?? "");

  // The website comes first; reading it runs in the background while the interview happens.
  const start = async () => {
    const u = site.trim();
    if (!u || !senderReady || busy) return;
    setBusy(true); setError("");
    try {
      const r = await startInterview();
      if (r.error) { setError(r.error); setBusy(false); return; }
    } catch {
      setError("Sign in again to start the interview."); setBusy(false); return;
    }
    setBusy(false);
    set({ url: u });
    api.analyze(u, undefined, g)
      .then((r) => { if (r.profile) set({ url: r.url ?? u, profile: { ...r.profile, goal: g }, prospects: [], searchStats: undefined }); })
      .catch(() => {});
    setStarted(true);
  };

  if (started) return <InterviewScreen key={g} goal={g} />;
  if (!authReady) return null;
  if (!session) return <main className="flex min-h-screen items-center justify-center px-6"><SignIn reason="Sign in to start your 60-second interview. Free: 3 interviews and 3 films a day." /></main>;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6 text-ink">
      {onlyCustomers && <p className="text-sm text-grain">Only customer hunting for now.</p>}
      <input
        autoFocus
        className="h-16 w-full max-w-2xl min-w-0 border-b border-rule bg-transparent text-center text-3xl text-ink outline-none placeholder:text-grain/70 focus:border-ink"
        value={site}
        placeholder="yourstartup.com"
        onChange={(e) => setSite(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") void start(); }}
      />
      <SenderFields fallbackEmail={session.user.email ?? ""} />
      <Button variant="primary" className="h-14 px-8 text-lg" disabled={!site.trim() || !senderReady || busy} onClick={() => void start()}>
        {busy ? "Starting…" : "Start interview"} <ArrowRight className="h-5 w-5" />
      </Button>
      {error && <p className="max-w-md text-center text-sm text-grain" role="alert">{error}</p>}
    </main>
  );
}

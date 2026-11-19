import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Connection, CustomerProfile, Film, Prospect, Stage } from "./types";
import { api, type FilmDto } from "./api";
import type { Interview } from "@/lib/interview";
import { demoWorkspace, isDemoUrl, demoFlag, setDemoFlag } from "./demo";
import { useAuth } from "./auth";
import { supabase } from "@/integrations/supabase/client";
import { useRouterState } from "@tanstack/react-router";
import type { Json } from "@/integrations/supabase/types";

export type Workspace = {
  url: string;
  profile: CustomerProfile | null;
  prospects: Prospect[];
  searchStats?: { hackernews: number; reddit: number; scanned: number };
  connections?: Connection[];
  /** answers from the voice interview, edited on the walkthrough */
  interview?: Interview;
  /** who the films and emails come from, set on the walkthrough */
  sender?: { name: string; email: string; role: string; linkedin: string };
  /** companies picked on /leads to make videos for */
  selectedLeads?: { company: string; url: string; why: string; name?: string }[];
  updatedAt: string;
};

const KEY = "first-hundred:workspace";
const empty = (): Workspace => ({ url: "", profile: null, prospects: [], updatedAt: new Date().toISOString() });

function load(): Workspace {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

type Ctx = {
  isDemo: boolean;
  extractingInterview: boolean;
  setExtractingInterview: (pending: boolean) => void;
  ws: Workspace;
  set: (patch: Partial<Workspace>) => void;
  updateProspect: (id: string, patch: Partial<Prospect>) => void;
  setStage: (id: string, stage: Stage) => void;
  reset: () => void;
  importJSON: (json: string) => void;
  exportJSON: () => string;
  startFilm: (id: string, url?: string) => Promise<void>;
  stats: { customers: number; contacted: number; replied: number; replyRate: number; hot: number; films: number };
};

const WorkspaceCtx = createContext<Ctx | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [ws, setWs] = useState<Workspace>(empty);
  const [ready, setReady] = useState(false);
  const [extractingInterview, setExtractingInterview] = useState(false);
  // Demo mode (?demo=1) is decided once at load and saves to its own slot, so it never overwrites real data.
  // It stays on for this tab (also across reloads) until the visitor signs in.
  const demoRef = useRef(false);
  const [demo, setDemo] = useState(false);
  const enterDemo = () => {
    demoRef.current = true; setDemo(true); setDemoFlag(true);
    let saved: Workspace | null = null;
    try { const raw = localStorage.getItem(`${KEY}:demo`); saved = raw ? { ...empty(), ...JSON.parse(raw) } : null; } catch { /* blocked */ }
    setWs(saved?.interview ? saved : demoWorkspace());
  };
  useEffect(() => {
    if (isDemoUrl() || demoFlag()) enterDemo(); else setWs(load());
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const href = useRouterState({ select: (s) => s.location.href });
  useEffect(() => {
    if (ready && !demoRef.current && isDemoUrl()) enterDemo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href, ready]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(demoRef.current ? `${KEY}:demo` : KEY, JSON.stringify(ws)); } catch { /* storage full or blocked */ }
  }, [ws, ready]);

  // Signed in: the account's saved workspace wins if it is newer, and every change is saved back (debounced).
  const { session, ready: authReady } = useAuth();
  const userId = session?.user.id;
  // Signing in during the example ends it and brings back the account's own workspace.
  const sawSignedOut = useRef(false);
  useEffect(() => {
    if (!authReady || !demoRef.current) return;
    if (!userId) { sawSignedOut.current = true; return; }
    if (sawSignedOut.current) { demoRef.current = false; setDemo(false); setDemoFlag(false); setWs(load()); }
  }, [authReady, userId]);
  const synced = useRef<string | null>(null);
  const lastUser = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || demoRef.current) return;
    if (!userId) {
      // Signing out leaves nothing of the last account in this browser.
      if (lastUser.current) { setWs(empty()); try { localStorage.removeItem(KEY); } catch { /* blocked */ } }
      lastUser.current = null; synced.current = null;
      return;
    }
    if (synced.current === userId) return;
    lastUser.current = userId;
    let live = true;
    (async () => {
      const [w, p] = await Promise.all([
        supabase.from("workspaces").select("data").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("name, email, role, linkedin_url").eq("id", userId).maybeSingle(),
      ]);
      if (!live) return;
      const remote = (w.data?.data ?? null) as Partial<Workspace> | null;
      const meta = session?.user.user_metadata ?? {};
      setWs((local) => {
        const useRemote = !!remote && (!!remote.url || !!remote.prospects?.length) && (remote.updatedAt ?? "") > (local.updatedAt ?? "");
        const next: Workspace = useRemote ? { ...empty(), ...remote } : local;
        if (next.sender?.name) return next;
        return { ...next, sender: {
          name: p.data?.name || (typeof meta.full_name === "string" ? meta.full_name : "") || next.sender?.name || "",
          email: p.data?.email || session?.user.email || next.sender?.email || "",
          role: p.data?.role || next.sender?.role || "",
          linkedin: p.data?.linkedin_url || next.sender?.linkedin || "",
        } };
      });
      synced.current = userId;
    })().catch(() => { synced.current = userId; });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId]);
  useEffect(() => {
    if (!userId || synced.current !== userId || demoRef.current) return;
    const t = setTimeout(() => {
      void supabase.from("workspaces").upsert({ user_id: userId, data: ws as unknown as Json, updated_at: new Date().toISOString() });
    }, 1000);
    return () => clearTimeout(t);
  }, [ws, userId]);
  const senderKey = JSON.stringify(ws.sender ?? null);
  useEffect(() => {
    const s = ws.sender;
    if (!userId || synced.current !== userId || !s?.name) return;
    const t = setTimeout(() => {
      void supabase.from("profiles").upsert({ id: userId, name: s.name, email: s.email, role: s.role, linkedin_url: s.linkedin, updated_at: new Date().toISOString() });
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [senderKey, userId]);

  // Films render on coldopen in about a minute: poll every unfinished one, wherever the user is.
  const wsRef = useRef(ws);
  wsRef.current = ws;
  const patchFilm = (id: string, patch: Partial<Film>) =>
    setWs((w) => ({ ...w, prospects: w.prospects.map((p) => (p.id === id && p.film ? { ...p, film: { ...p.film, ...patch } } : p)) }));
  const fromDto = (d: FilmDto): Partial<Film> => ({
    status: d.status, label: d.progress?.label, error: d.error, share: d.share,
    film: d.files?.film, poster: d.files?.poster, gif: d.files?.gif, durationSec: d.durationSec,
  });
  useEffect(() => {
    const tick = setInterval(async () => {
      if (demoRef.current) return;
      const live = wsRef.current.prospects.filter((p) => p.film && (p.film.status === "queued" || p.film.status === "running") && p.film.id);
      for (const p of live) {
        try { patchFilm(p.id, fromDto(await api.filmStatus(p.film!.id))); } catch { /* try again next tick */ }
      }
    }, 4000);
    return () => clearInterval(tick);
  }, []);

  const value = useMemo<Ctx>(() => {
    const touched = ws.prospects.filter((p) => p.stage !== "new");
    const replied = ws.prospects.filter((p) => ["replied", "call", "customer"].includes(p.stage)).length;
    return {
      isDemo: demo,
      extractingInterview,
      setExtractingInterview,
      ws,
      set: (patch) => setWs((w) => ({ ...w, ...patch, updatedAt: new Date().toISOString() })),
      updateProspect: (id, patch) =>
        setWs((w) => ({ ...w, prospects: w.prospects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      setStage: (id, stage) =>
        setWs((w) => ({
          ...w,
          prospects: w.prospects.map((p) =>
            p.id === id ? { ...p, stage, contactedAt: p.contactedAt ?? (stage !== "new" ? new Date().toISOString() : undefined) } : p,
          ),
        })),
      reset: () => setWs(empty()),
      importJSON: (json) => setWs({ ...empty(), ...JSON.parse(json) }),
      exportJSON: () => JSON.stringify(ws, null, 2),
      startFilm: async (id, url) => {
        const p = wsRef.current.prospects.find((x) => x.id === id);
        const site = (url ?? p?.company_url ?? "").trim();
        if (demoRef.current || !p || !site || !wsRef.current.profile) return;
        const film: Film = { id: "", status: "queued", label: "Sending to coldopen…", url: site, startedAt: new Date().toISOString() };
        setWs((w) => ({ ...w, prospects: w.prospects.map((x) => (x.id === id ? { ...x, company_url: site, film } : x)) }));
        try {
          const d = await api.makeFilm(site, wsRef.current.profile, `first-hundred:${id}`);
          setWs((w) => ({ ...w, prospects: w.prospects.map((x) => (x.id === id ? { ...x, film: { ...film, id: d.id, ...fromDto(d) } } : x)) }));
        } catch (e) {
          setWs((w) => ({ ...w, prospects: w.prospects.map((x) => (x.id === id ? { ...x, film: { ...film, status: "failed", error: e instanceof Error ? e.message : String(e) } } : x)) }));
        }
      },
      stats: {
        customers: ws.prospects.filter((p) => p.stage === "customer").length,
        contacted: touched.length,
        replied,
        replyRate: touched.length ? Math.round((replied / touched.length) * 100) : 0,
        hot: ws.prospects.filter((p) => p.score >= 80).length,
        films: ws.prospects.filter((p) => p.film?.status === "succeeded").length,
      },
    };
  }, [ws, extractingInterview, demo]);

  // Workspace lives in this browser, so pages render after it is loaded.
  return <WorkspaceCtx.Provider value={value}>{ready ? children : null}</WorkspaceCtx.Provider>;
}

export function useWorkspace() {
  const c = useContext(WorkspaceCtx);
  if (!c) throw new Error("useWorkspace outside provider");
  return c;
}

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";

type Auth = { session: Session | null; ready: boolean; signOut: () => Promise<void> };
const AuthCtx = createContext<Auth>({ session: null, ready: false, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    const { data } = supabase.auth.onAuthStateChange((_event, s) => { if (live) { setSession(s); setReady(true); } });
    supabase.auth.getSession().then(({ data: d }) => { if (live) { setSession(d.session); setReady(true); } }).catch(() => setReady(true));
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);
  const signOut = async () => { await supabase.auth.signOut(); };
  return <AuthCtx.Provider value={{ session, ready, signOut }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

/** Google or an emailed sign-in link. Returns to the current page afterwards. */
export function SignIn({ reason }: { reason?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const here = typeof window !== "undefined" ? window.location.href : undefined;

  const google = async () => {
    setError("");
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: here });
    if ("error" in r && r.error) setError("Google sign-in didn't finish. Try again or use your email.");
  };
  const sendLink = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Check the email address."); return; }
    setState("sending"); setError("");
    const { error: e } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: here } });
    if (e) { setState("error"); setError("We couldn't send the link. Try again in a minute, or use Google."); }
    else setState("sent");
  };

  return (
    <div className="fade-in mx-auto w-full max-w-sm text-center text-ink">
      <h2 className="text-2xl font-medium tracking-tight">Sign in to continue</h2>
      <p className="mt-2 text-sm text-grain">{reason ?? "Free: 3 interviews and 3 films a day. Your leads and drafts are saved to your account."}</p>
      <Button variant="primary" className="mt-6 h-12 w-full" onClick={google}>Continue with Google</Button>
      <div className="my-5 flex items-center gap-3 text-xs text-grain"><span className="h-px flex-1 bg-ink/10" />or<span className="h-px flex-1 bg-ink/10" /></div>
      {state === "sent" ? (
        <p className="text-sm" role="status">Check {email} for a sign-in link. You can close this tab once you've opened it.</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void sendLink(); }} className="flex gap-2">
          <label className="sr-only" htmlFor="signin-email">Email</label>
          <input id="signin-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
            className="h-12 min-w-0 flex-1 border-0 border-b border-rule bg-transparent text-base outline-none placeholder:text-grain/70 focus:border-ink" />
          <Button type="submit" variant="secondary" className="h-12" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Email me a link"}</Button>
        </form>
      )}
      {error && <p className="mt-3 text-sm text-grain" role="alert">{error}</p>}
    </div>
  );
}

/** Shows sign-in instead of the page until there's a session. */
export function RequireAuth({ children, reason }: { children: ReactNode; reason?: string }) {
  const { session, ready } = useAuth();
  if (!ready) return null;
  if (!session) return <main className="flex min-h-screen items-center justify-center px-6"><SignIn reason={reason} /></main>;
  return <>{children}</>;
}

/** Small account chip, top right, while signed in. */
export function AccountChip() {
  const { session, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  if (!session) return null;
  const name = (session.user.user_metadata?.full_name as string | undefined) || session.user.email || "Account";
  return (
    <div className="fixed right-4 top-4 z-40 text-sm">
      <Button variant="bare" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="h-8 rounded-full bg-white/60 px-3 text-ink ring-1 ring-ink/10 backdrop-blur hover:bg-white/80">
        {name.split(/[\s@]/)[0]}
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white/90 p-3 text-left shadow-lg ring-1 ring-ink/10 backdrop-blur">
          <p className="truncate text-xs text-grain">{session.user.email}</p>
          <Button variant="bare" className="mt-2 h-8 w-full justify-start px-0 text-ink" onClick={() => { setOpen(false); void signOut(); }}>Sign out</Button>
        </div>
      )}
    </div>
  );
}

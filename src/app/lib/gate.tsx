import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { RequireAuth } from "./auth";
import { useWorkspace } from "./store";
import { Button } from "@/components/ui/button";

/** Sign-in gate that lets the example (demo workspace) through. */
export function RequireAuthOrDemo({ children }: { children: ReactNode }) {
  const { isDemo } = useWorkspace();
  return isDemo ? <>{children}</> : <RequireAuth>{children}</RequireAuth>;
}

/** Shown where a real step would call the server. */
export function DemoNote({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 text-center ${className}`}>
      <p className="text-sm text-grain">Example only. Sign in to make your own.</p>
      <Button asChild variant="secondary"><Link to="/interview" search={{ goal: "customers" }}>Sign in</Link></Button>
    </div>
  );
}

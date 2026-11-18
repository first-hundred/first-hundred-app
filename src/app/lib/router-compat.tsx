// Small adapter so the original pages keep their navigation calls on TanStack Router.
import { Link, Navigate as TNavigate, useNavigate as useTNavigate, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function useNavigate() {
  const nav = useTNavigate();
  return (to: string) => {
    const [path, qs] = to.split("?");
    // deno-lint-ignore no-explicit-any
    nav({ to: path as any, search: (qs ? Object.fromEntries(new URLSearchParams(qs)) : {}) as any });
  };
}

export function Navigate({ to }: { to: string; replace?: boolean }) {
  // deno-lint-ignore no-explicit-any
  return <TNavigate to={to as any} replace />;
}

export function useSearchParams(): [URLSearchParams] {
  const loc = useLocation();
  return [new URLSearchParams(loc.searchStr ?? "")];
}

export function NavLink({ to, className, children }: { to: string; className: (s: { isActive: boolean }) => string; children: ReactNode }) {
  const loc = useLocation();
  // deno-lint-ignore no-explicit-any
  return <Link to={to as any} className={className({ isActive: loc.pathname === to })}>{children}</Link>;
}

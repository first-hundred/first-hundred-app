// OWNER: Jakob — replace this stub. Contract: docs/SPEC-call-rehearsal.md
import { X } from "lucide-react";
import type { CustomerProfile, Prospect } from "../../lib/types";

export function RehearsalPanel(props: { prospect: Prospect; profile: CustomerProfile; goal: "customers" | "investors"; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40" onClick={props.onClose}>
      <div className="card w-full max-w-lg p-8 text-center" onClick={(e) => e.stopPropagation()}>
        <button className="btn-ghost float-right px-2" onClick={props.onClose}><X className="h-4 w-4" /></button>
        <h2 className="text-xl font-bold">Rehearse the call with {props.prospect.author}</h2>
        <p className="mt-2 text-sm text-slate-500">Coming soon.</p>
      </div>
    </div>
  );
}

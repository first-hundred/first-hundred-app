import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { Interview } from "@/lib/interview";
import { api } from "../lib/api";
import { useWorkspace } from "../lib/store";

import { Button } from "@/components/ui/button";
import { Ticker } from "@/components/look/Ticker";
import { SenderFields, useSender } from "./SenderFields";


function describe(i: Interview) {
  return [
    i.pitch,
    [i.buyer.role, i.buyer.companyType, i.buyer.size].filter(Boolean).join(", ") && `Ideal ${i.goal === "customers" ? "buyer" : i.goal === "investors" ? "investor" : "hire"}: ${[i.buyer.role, i.buyer.companyType, i.buyer.size].filter(Boolean).join(", ")}.`,
    i.points.filter(Boolean).join(" "),
  ].filter(Boolean).join(" ");
}

type WS = ReturnType<typeof useWorkspace>;
let latestSet: WS["set"] | null = null;
let startedFor = "";

const looksLikeDomain = (v: string) => /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(v.trim());

// Lives outside the component so leaving the page never cancels it.
function startAnalysis(i: Interview) {
  const site = i.website.trim();
  if (!looksLikeDomain(site) || startedFor === site) return;
  startedFor = site;
  api.analyze(i.website, describe(i), i.goal).then((r) => {
    if (!r.profile || !latestSet) return;
    const base = r.profile;
    const profile = {
      ...base,
      goal: i.goal,
      product_one_liner: i.pitch || base.product_one_liner,
      ideal_customer: {
        role: i.buyer.role || base.ideal_customer.role,
        company_type: i.buyer.companyType || base.ideal_customer.company_type,
        company_size: i.buyer.size || base.ideal_customer.company_size,
      },
      pitch: {
        ...(base.pitch ?? { offer: "", points: [], proof: [], cta_line: "", contact: "" }),
        ...(i.pitch ? { offer: i.pitch } : {}),
        ...(i.points.some(Boolean) ? { points: i.points.filter(Boolean) } : {}),
        ...(i.proof.length ? { proof: i.proof.filter((p) => p.value || p.label) } : {}),
        ...(i.ask ? { cta_line: i.ask } : {}),
        ...(i.contact ? { contact: i.contact } : {}),
      },
    };
    latestSet({ url: r.url ?? i.website, profile, prospects: [], searchStats: undefined });
  }).catch(() => { startedFor = ""; });
}

export default function Walkthrough() {
  const navigate = useNavigate();
  const { ws, set, extractingInterview } = useWorkspace();
  const i = ws.interview;
  latestSet = set;
  const latest = useRef(i);
  latest.current = i;
  const site = i?.website ?? "";

  useEffect(() => { if (!i && !extractingInterview) navigate({ to: "/start" }); }, [i, extractingInterview, navigate]);
  useEffect(() => {
    if (!looksLikeDomain(site)) return;
    const t = setTimeout(() => { if (latest.current) startAnalysis(latest.current); }, 600);
    return () => clearTimeout(t);
  }, [site]);
  if (extractingInterview) return <main className="flex min-h-screen items-center justify-center px-6 text-ink"><Ticker phase="interview" /></main>;
  if (!i) return null;

  const contactEmail = i.contact.includes("@") ? i.contact.trim() : "";
  const { sender, ready } = useSender(contactEmail);
  const canGo = !!i.website.trim() && ready;
  const go = () => {
    if (!canGo) return;
    if (!ws.sender) set({ sender });
    startAnalysis(i);
    navigate({ to: "/leads" });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6 text-ink">
      <div className="fade-in w-full max-w-2xl">
        <input
          autoFocus
          className="h-16 w-full min-w-0 border-b border-rule bg-transparent text-center text-3xl text-ink outline-none placeholder:text-grain/70 focus:border-ink"
          value={i.website}
          placeholder="yourstartup.com"
          onChange={(e) => set({ interview: { ...i, website: e.target.value } })}
          onKeyDown={(e) => { if (e.key === "Enter") go(); }}
        />
      </div>
      <SenderFields fallbackEmail={contactEmail} />
      <Button variant="primary" className="h-14 px-8 text-lg" disabled={!canGo} onClick={go}>
        Find my first 100 <ArrowRight className="h-5 w-5" />
      </Button>
    </main>
  );
}

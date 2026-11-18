import { RequireAuth } from "@/app/lib/auth";
import { createFileRoute } from "@tanstack/react-router";
import Walkthrough from "@/app/flow/Walkthrough";

export const Route = createFileRoute("/walkthrough")({
  head: () => ({
    meta: [
      { title: "What we heard — First Hundred" },
      { name: "description", content: "Check and edit your answers, one card at a time, then find your first 100." },
      { property: "og:title", content: "What we heard — First Hundred" },
      { property: "og:description", content: "Check and edit your answers, one card at a time, then find your first 100." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GatedWalkthrough,
});

function GatedWalkthrough() {
  return <RequireAuth><Walkthrough /></RequireAuth>;
}

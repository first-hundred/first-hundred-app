import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/pages/Today";

export const Route = createFileRoute("/_app/today")({
  head: () => ({
    meta: [
      { title: "Today's 10 — First Hundred" },
      { name: "description", content: "The ten conversations to start today." },
      { property: "og:title", content: "Today's 10 — First Hundred" },
      { property: "og:description", content: "The ten conversations to start today." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

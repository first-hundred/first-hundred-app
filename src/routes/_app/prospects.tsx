import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/pages/Prospects";

export const Route = createFileRoute("/_app/prospects")({
  head: () => ({
    meta: [
      { title: "Prospects — First Hundred" },
      { name: "description", content: "People on Hacker News, Reddit and events ranked by buying intent." },
      { property: "og:title", content: "Prospects — First Hundred" },
      { property: "og:description", content: "People on Hacker News, Reddit and events ranked by buying intent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

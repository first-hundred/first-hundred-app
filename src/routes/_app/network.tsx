import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/pages/Network";

export const Route = createFileRoute("/_app/network")({
  head: () => ({
    meta: [
      { title: "Warm paths — First Hundred" },
      { name: "description", content: "Find buyers and connectors in your own network." },
      { property: "og:title", content: "Warm paths — First Hundred" },
      { property: "og:description", content: "Find buyers and connectors in your own network." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

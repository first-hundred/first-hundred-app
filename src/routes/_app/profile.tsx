import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/pages/Profile";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [
      { title: "Buyer profile — First Hundred" },
      { name: "description", content: "Who buys first, their pains, and the exact phrases they use." },
      { property: "og:title", content: "Buyer profile — First Hundred" },
      { property: "og:description", content: "Who buys first, their pains, and the exact phrases they use." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

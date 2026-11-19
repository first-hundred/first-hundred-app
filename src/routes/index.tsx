import { createFileRoute } from "@tanstack/react-router";
import Page from "@/app/pages/Home";

const TITLE = "First Hundred";
const DESCRIPTION = "Find your first 100 customers, investors or hires.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://raw.githubusercontent.com/first-hundred/first-hundred-app/main/docs/media/first-hundred-demo.gif" },
      { name: "twitter:image", content: "https://raw.githubusercontent.com/first-hundred/first-hundred-app/main/docs/media/first-hundred-demo.gif" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

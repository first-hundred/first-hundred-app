import { RequireAuth } from "@/app/lib/auth";
import { createFileRoute } from "@tanstack/react-router";
import PreviewPage from "@/app/preview/PreviewPage";

export const Route = createFileRoute("/preview")({
  head: () => ({
    meta: [
      { title: "Preview and send — First Hundred" },
      { name: "description", content: "Watch each company's 30-second film and send the first message from your own mail app." },
      { property: "og:title", content: "Preview and send — First Hundred" },
      { property: "og:description", content: "Watch each company's 30-second film and send the first message from your own mail app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GatedPreview,
});

function GatedPreview() {
  return <RequireAuth><PreviewPage /></RequireAuth>;
}

import { RequireAuth } from "@/app/lib/auth";
import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/app/components/Layout";

export const Route = createFileRoute("/_app")({ component: GatedLayout });

function GatedLayout() {
  return <RequireAuth><Layout /></RequireAuth>;
}

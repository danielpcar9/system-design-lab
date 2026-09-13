import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/lab/app-shell";
import { Landing } from "@/components/lab/landing";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <AppShell>
      <Landing />
    </AppShell>
  );
}

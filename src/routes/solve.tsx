import { createFileRoute, redirect } from "@tanstack/react-router";

// "Solve a Problem" now lives inside Ask AI — keep old links working.
export const Route = createFileRoute("/solve")({
  beforeLoad: () => {
    throw redirect({ to: "/chat", replace: true });
  },
});

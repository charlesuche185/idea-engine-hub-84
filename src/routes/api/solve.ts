import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SOLVE_SYSTEM, requireUser, streamAI } from "@/lib/ai.server";

const schema = z.object({
  problem: z.string().min(5).max(5000),
  category: z.string().max(50),
});

export const Route = createFileRoute("/api/solve")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await requireUser(request);
        if (!user) return new Response("Unauthorized", { status: 401 });
        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        const { problem, category } = parsed.data;
        return streamAI(request, SOLVE_SYSTEM, [
          { role: "user", content: `Category: ${category}\n\nProblem:\n${problem}` },
        ]);
      },
    },
  },
});

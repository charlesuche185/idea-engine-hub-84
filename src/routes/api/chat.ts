import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CHAT_SYSTEM, requireUser, streamAI, toModelMessages } from "@/lib/ai.server";

const schema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(20000),
        image: z.string().max(4_000_000).nullable().optional(),
      }),
    )
    .min(1)
    .max(100),
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await requireUser(request);
        if (!user) return new Response("Unauthorized", { status: 401 });
        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        return streamAI(request, CHAT_SYSTEM, toModelMessages(parsed.data.messages));
      },
    },
  },
});

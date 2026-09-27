import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import { createClient } from "@supabase/supabase-js";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";
export const ERROR_SENTINEL = "\u0000[[SOLVEX_ERROR]]";

export const CHAT_SYSTEM = `You are Solve X, an AI innovation assistant whose purpose is "Turn Problems Into Solutions."
You help students, young innovators, entrepreneurs, researchers and everyday people understand problems and turn them into practical ideas.

Rules:
- Accuracy first. Think carefully before answering factual questions. If unsure, say "I'm not certain about that. Here's what can be established..." and explain.
- NEVER invent statistics, research papers, organizations, grants, scholarships, URLs, company information, or people's names/achievements. If you mention something that could change over time, say it should be verified.
- You do not have live web access. For current events or recent information, say so and suggest how the user can verify.
- If a request is genuinely unclear, ask ONE short clarifying question instead of guessing.
- Match depth to the request: short answers for simple questions, detailed ones when asked. Adjust explanation level (e.g. "explain like I'm 12") when requested.
- Format for phone screens with Markdown: short paragraphs, headings, bullets, numbered steps, bold key points, tables only when useful, code blocks when needed.
- For complicated problems use this structure: **Understanding the problem**, **Possible causes / considerations**, **Solution or ideas**, **Step-by-step plan**, **What to do next**.
- For images: describe only what is actually visible. If the image is unclear or you cannot identify something reliably, say so rather than guessing.`;

export const SOLVE_SYSTEM = `${CHAT_SYSTEM}

You are now in "Solve a Problem" mode. Analyze the user's real-world problem and respond in Markdown with EXACTLY these level-2 headings in this order:
## Problem Understanding
## Possible Causes
## Solution Ideas
## Recommended Project Direction
## Materials / Resources
## Implementation Steps
## Challenges
## Improvement Ideas
## Project Title
Under "Project Title" write only one short, catchy title on a single line (no quotes, no extra text).
Be practical, realistic and locally appropriate. Keep each section concise. Do not invent statistics or named organizations.`;

export async function requireUser(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const sb = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export type InMessage = { role: "user" | "assistant"; content: string; image?: string | null | undefined };

export function toModelMessages(msgs: InMessage[]): ModelMessage[] {
  return msgs.slice(-30).map((m) => {
    if (m.role === "assistant") return { role: "assistant", content: m.content || " " };
    const parts: Array<{ type: "text"; text: string } | { type: "image"; image: string }> = [];
    if (m.image && m.image.startsWith("data:image/")) parts.push({ type: "image", image: m.image });
    parts.push({ type: "text", text: m.content || "Please look at this image." });
    return { role: "user", content: parts };
  });
}

export function streamAI(request: Request, system: string, messages: ModelMessage[]): Response {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return new Response("AI not configured", { status: 500 });
  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
      return res;
    },
  });
  const result = streamText({
    model: provider.responses(MODEL),
    system,
    messages,
    abortSignal: request.signal,
    maxRetries: 0,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") controller.enqueue(enc.encode(part.text));
          else if (part.type === "error") {
            console.error("AI stream error", part.error);
            const status = (part.error as { statusCode?: number })?.statusCode;
            controller.enqueue(enc.encode(`${ERROR_SENTINEL}${status ?? ""}`));
          }
        }
      } catch (e) {
        if (!request.signal.aborted) {
          console.error("AI error", e);
          controller.enqueue(enc.encode(ERROR_SENTINEL));
        }
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
  });
}

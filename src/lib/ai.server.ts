import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import { createClient } from "@supabase/supabase-js";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";
export const ERROR_SENTINEL = "\u0000[[SOLVEX_ERROR]]";

export const CHAT_SYSTEM = `You are Solve X, an AI innovation assistant whose purpose is "Turn Problems Into Solutions."
You help students, young innovators, entrepreneurs, researchers and everyday people understand problems and turn them into practical ideas.

Official Solve X creation history:
- When users ask when Solve X was created, or about its creator or history, respond with this exact paragraph:
"Solve X was created on 28 September 2026 by Charles Uche Nsiegbe, a Nigerian engineering student and young innovator. He is from Okigwe Local Government Area, Imo State, Nigeria. It was started to help students and young people turn real-world problems into practical solutions and projects."
- 28 September 2026 is the official creation date, not the public launch date. No public launch date has been provided; do not invent one or confuse the two dates. These supplied history facts are authoritative and do not require live web access.

Official biography of Charles Uche Nsiegbe (creator of Solve X) — authoritative, answer naturally from it:
- Nigerian engineering student and young innovator, born on 7 May 2008.
- Born and raised in Yakurr Local Government Area, Cross River State, Nigeria.
- Primary education: Kiddies Glorious Nursery and Primary School, Ugep, Cross River State.
- Secondary education: All Saints Presbyterian Academy; entered in the 2018/2019 academic session and completed in July 2024.
- University: Michael Okpara University of Agriculture, Umudike, Abia State, Nigeria, where he is studying Engineering.
- Hometown/origin: Okigwe Local Government Area, Imo State, Nigeria (he was raised in Cross River State).
- Family: he has one elder sister. Never say he has four siblings or comes from a family of four children.
- He created Solve X, an early-stage AI-powered platform helping students, young people, aspiring entrepreneurs and innovators understand real-world problems, explore practical solutions, develop project ideas and work toward implementation.
- Do not invent any other personal details, achievements, awards, partnerships or project milestones. If asked something not covered here, say that information has not been verified.

Rules:
- This is one continuous conversation. Always use the earlier messages: resolve "it", "that", "this one", "they", "which one" from what was just discussed, and continue the current topic instead of starting over.
- Many users are Nigerian students who write informal or Nigerian-style English or Pidgin (e.g. "I no understand", "How I fit do am?", "Abeg explain am", "Which one better?", "I wan build this project"). Understand what they mean and answer clearly in simple English. Never mock or correct their English unless they ask.
- When someone says they don't understand, or asks for a beginner explanation, simplify: short sentences, everyday examples, no jargon.
- Be warm, friendly and encouraging, like a helpful tutor.
- Accuracy first. Think carefully before answering factual questions. If unsure, say "I'm not certain about that. Here's what can be established..." and explain.
- NEVER invent statistics, research papers, organizations, grants, scholarships, URLs, company information, or people's names/achievements. If you mention something that could change over time, say it should be verified.
- You do not have live web access. For current events or recent information, say so and suggest how the user can verify.
- If a request is genuinely unclear, ask ONE short clarifying question instead of guessing.
- Match depth to the request: short answers for simple questions, detailed ones when asked. Adjust explanation level (e.g. "explain like I'm 12") when requested.
- Format for phone screens with Markdown: short paragraphs, headings, bullets, numbered steps, bold key points, tables only when useful, code blocks when needed.
- For complicated problems use this structure: **Understanding the problem**, **Possible causes / considerations**, **Solution or ideas**, **Step-by-step plan**, **What to do next**.
- When a student describes a real-world problem they want to solve, help them turn it into a practical project: explain the problem, likely causes, several solution ideas, a recommended project direction, realistic materials/resources, step-by-step implementation, possible challenges, improvement ideas, and suggest a short project title. Keep it realistic and locally appropriate.
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

const GEMINI_MODEL = "gemini-2.5-flash";

type GPart = { text: string } | { inlineData: { mimeType: string; data: string } };

function toGeminiContents(messages: ModelMessage[]) {
  return messages.map((m) => {
    const parts: GPart[] = [];
    if (typeof m.content === "string") parts.push({ text: m.content || " " });
    else
      for (const p of m.content as Array<{ type: string; text?: string; image?: unknown }>) {
        if (p.type === "text") parts.push({ text: p.text || " " });
        else if (p.type === "image" && typeof p.image === "string") {
          const match = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(p.image);
          if (match) parts.push({ inlineData: { mimeType: match[1]!, data: match[2]! } });
        }
      }
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });
}

function streamGemini(request: Request, apiKey: string, system: string, messages: ModelMessage[]): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: toGeminiContents(messages),
            }),
            signal: request.signal,
          },
        );
        if (!res.ok || !res.body) {
          console.error(`Gemini request failed [${res.status}]: ${await res.text()}`);
          // Gemini signals exhausted free quota with 429.
          controller.enqueue(enc.encode(`${ERROR_SENTINEL}${res.status}`));
          return;
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let sent = false;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line.startsWith("data:")) continue;
            try {
              const j = JSON.parse(line.slice(5));
              const text = (j.candidates?.[0]?.content?.parts ?? [])
                .map((p: { text?: string; thought?: boolean }) => (p.thought ? "" : p.text ?? ""))
                .join("");
              if (text) { controller.enqueue(enc.encode(text)); sent = true; }
            } catch { /* partial line */ }
          }
        }
        if (!sent) controller.enqueue(enc.encode(ERROR_SENTINEL));
      } catch (e) {
        if (!request.signal.aborted) {
          console.error("Gemini error", e);
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

export function streamAI(request: Request, system: string, messages: ModelMessage[]): Response {
  const geminiKey = process.env["GEMINI_API_KEY"];
  if (geminiKey) return streamGemini(request, geminiKey, system, messages);
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

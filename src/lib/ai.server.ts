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

Response quality:
- Understand the user's immediate goal, context, and level. Resolve references from earlier messages and answer the current question instead of restarting the conversation.
- Put the answer or recommendation first. Keep simple answers brief; use structure only when it makes a complex answer easier to use. Do not restate the question, repeat a point, or add filler.
- Think critically: check important assumptions, distinguish known facts from inference, and respectfully correct a false premise. Give the key reasons for a recommendation without exposing private step-by-step reasoning.
- Be accurate. Never invent statistics, research, organizations, grants, scholarships, URLs, company details, or personal achievements. Use realistic numbers only when confident; qualify estimates and facts that may have changed.
- Ask one short clarifying question only when missing information would materially change the answer, create a safety risk, or make useful progress impossible. Otherwise state a reasonable assumption and answer.
- Offer alternatives and trade-offs when they help the user decide, not as a fixed requirement for every problem. Recommend a practical next step when useful.
- For real-world problems the user wants to solve, help turn the problem into a feasible, locally appropriate project. Include causes, options, a recommendation, resources, steps, and challenges when relevant; do not force this project format onto unrelated or simple questions.
- Adapt to the user's language and familiarity. Many users are Nigerian students who write informal English or Pidgin (e.g. "I no understand", "How I fit do am?", "Abeg explain am", "Which one better?", "I wan build this project"). Understand them, answer clearly and warmly, and never mock or correct their English unless asked. Simplify with everyday examples when requested.
- Format for phone screens. Use short paragraphs, headings, bullets, and numbered steps when useful; use tables only when they improve clarity.
- You do not have live web access. For current events or recent information, say so and suggest how to verify it. Include only stable official URLs you are confident are real; otherwise tell the user what to search for.
- Never claim to have taken an action outside this chat. If correcting yourself, say so clearly. Finish the answer completely.
- For images, describe only what is actually visible. If something is unclear, say so rather than guessing.`;

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
Be practical, realistic and locally appropriate. Keep each section concise and make sure each section adds new information instead of repeating the recommendation. Do not invent statistics or named organizations. State reasonable assumptions; ask one brief clarification only if missing information makes a useful or safe recommendation impossible.`;

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

const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_FALLBACK_MODEL = "gemini-flash-lite-latest";
const INCOMPLETE_CODE = 1;

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
        const call = (model: string) =>
          fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: toGeminiContents(messages),
              generationConfig: { maxOutputTokens: 4096, temperature: 0.4 },
            }),
            signal: request.signal,
          });
        let res = await call(GEMINI_MODEL);
        // One bounded fallback when the main model is overloaded (free tier, no cost).
        if (res.status >= 500) {
          console.error(`Gemini ${GEMINI_MODEL} unavailable [${res.status}]: ${await res.text()}`);
          res = await call(GEMINI_FALLBACK_MODEL);
        }
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
        let finish: string | undefined;
        const handle = (raw: string) => {
          const line = raw.trim();
          if (!line.startsWith("data:")) return;
          try {
            const j = JSON.parse(line.slice(5));
            const cand = j.candidates?.[0];
            if (cand?.finishReason) finish = cand.finishReason;
            const text = (cand?.content?.parts ?? [])
              .map((p: { text?: string; thought?: boolean }) => (p.thought ? "" : p.text ?? ""))
              .join("");
            if (text) { controller.enqueue(enc.encode(text)); sent = true; }
          } catch (e) {
            console.error("Gemini parse error", e);
          }
        };
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            handle(buf.slice(0, nl));
            buf = buf.slice(nl + 1);
          }
        }
        buf += dec.decode();
        if (buf) handle(buf);
        if (!sent) controller.enqueue(enc.encode(ERROR_SENTINEL));
        else if (finish !== "STOP") {
          console.error("Gemini answer incomplete, finishReason:", finish);
          controller.enqueue(enc.encode(`${ERROR_SENTINEL}${INCOMPLETE_CODE}`));
        }
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

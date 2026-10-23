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
- Start with the answer or recommendation that best fits the user's intent. Do not quote or restate the entire question or add a long summary; keep simple answers brief and use structure only when it improves a complex answer.
- Be a patient teacher for children and students. Match the learner's stated age, grade, experience, and preferred language. If that is unknown, start with clear everyday language without talking down or asking for age unnecessarily.
- For difficult topics or learning questions, build the explanation one step at a time. Define unfamiliar terms, use a relatable example or analogy, explain why the answer and important steps are correct, and show a way to check the result when appropriate. Teach a reusable method instead of giving only a final answer.
- Treat confusion and mistakes as normal parts of learning. Be encouraging and respectful; do not shame the learner. Offer one or two optional practice questions when they would help, and let the learner try before giving solutions.
- Use the conversation history to remember the learner's level and what has already been explained. For follow-ups, answer the new point directly; do not repeat the whole lesson unless the learner asks.
- Think critically: check important assumptions, distinguish known facts from inference, and respectfully correct a false premise. Explain the reasoning needed to support or teach the answer without presenting private internal reasoning.
- Be accurate. Never invent statistics, research, organizations, grants, scholarships, URLs, company details, or personal achievements. Use realistic numbers only when confident; qualify estimates and facts that may have changed.
- Ask one short clarifying question only when missing information would materially change the answer, create a safety risk, or make useful progress impossible. Otherwise state a reasonable assumption and answer.
- Offer alternatives and trade-offs when they help the user decide, not as a fixed requirement for every problem. Recommend a practical next step when useful.
- For real-world problems, distinguish observed facts from possible causes and avoid presenting an unverified cause as certain. When useful, explore 2-4 feasible solutions and compare their relative cost and difficulty using the user's known budget, skills, and available resources. If those details are unknown, state reasonable assumptions and favor accessible options instead of inventing prices or resources.
- When helping someone build a project, recommend an approach that fits their constraints, identify needed materials and skills, give practical implementation steps, and describe a small pilot or test with observable success criteria. Treat ideas as untested until evidence supports them; never claim an untested solution is proven.
- For travel questions, use the traveler's stated priorities (such as peace, nature, tourism, food, budget, and travel style). Recommend the best fit first, explain why, and compare only a few alternatives. Ask about budget only when it would materially change the recommendation.
- Never promise that a country or destination is completely safe or has zero risk of war or conflict. Visa, entry, cost, safety, and conflict details can change. Do not present them as current or verified without actually using a current, reliable source.
- This app has no live search or browsing feature. Do not guess current visa eligibility, entry documents, conflict status, safety ratings, prices, or fares. Say current details cannot be verified here and direct travelers to official government travel advisories and the destination's immigration or embassy sources. Do not invent source links.
- Adapt to the user's language and familiarity. Many users are Nigerian students who write informal English or Pidgin (e.g. "I no understand", "How I fit do am?", "Abeg explain am", "Which one better?", "I wan build this project"). Understand them, answer clearly and warmly, and never mock or correct their English unless asked. Simplify with everyday examples when requested.
- Format for phone screens. Use short paragraphs, headings, bullets, and numbered steps when useful; use tables only when they improve clarity.
- You do not have live web access. For current events or recent information, say so and suggest how to verify it. Include only stable official URLs you are confident are real; otherwise tell the user what to search for.
- Never claim to have taken an action outside this chat. If correcting yourself, say so clearly. Finish the answer completely.
- For images, describe only what is actually visible. If something is unclear, say so rather than guessing.`;

export const TRAVEL_SYSTEM = `Travel-specific response rules:
- Answer the traveler's intent directly. Start with one best-fit destination based on their stated preferences, explain the fit briefly, and compare at most two alternatives. Do not repeat their whole question or produce a generic destination list.
- Personalize using the details they gave about peace, nature, tourism, food, budget, travel dates, and starting point. Do not assume a passport nationality from where they live or depart.
- Use only stable travel facts you are confident about. Do not invent attractions, local dishes, weather, opening status, transport times, or travel prices.
- This app has no live search or browsing. Never state current visa/visa-free eligibility, entry documents, conflict conditions, security advisories, safety ratings, fares, or costs as facts from memory. State plainly that you cannot verify current information here and direct the traveler to official government travel advisories and the destination's immigration or embassy sources. Do not invent URLs or imply those sources were checked.
- Never describe any destination as completely safe, risk-free, or having zero chance of war. Do not call an area "generally peaceful" or "safe for tourists" without a current official source actually consulted; this app cannot consult one.
- Visa rules depend on passport nationality, purpose, length of stay, and travel dates. Ask for missing details only if the traveler needs personal eligibility guidance and the missing detail materially changes the answer.
- Ask about budget only when it would materially change which destination you recommend. If it is unknown and not essential, state a modest assumption and proceed; do not invent exact prices.
- If current information is requested, clearly separate the recommendation from details that still need official verification.`;

export const SOLVE_SYSTEM = `${CHAT_SYSTEM}

You are now in "Solve a Problem" mode. Analyze the user's real-world problem and respond in Markdown with EXACTLY these level-2 headings in this order:
## Problem Understanding
## Possible Causes
## Solution Ideas
## Solution Comparison
## Recommended Project Direction
## Materials / Resources
## Implementation Steps
## Challenges
## How to Test
## Improvement Ideas
## Project Title
Under "Project Title" write only one short, catchy title on a single line (no quotes, no extra text).
For Possible Causes, separate what the user observed from plausible but unconfirmed explanations. Give 2-4 practical options when appropriate. In Solution Comparison, compare relative cost, difficulty, required skills/materials, and maintenance; use qualitative ranges when exact prices are unknown, and never invent prices. Consider a stated budget and available resources; if unknown, state assumptions and favor an accessible first version. Recommend the most realistic option and explain why it fits. Make Implementation Steps specific and ordered. In How to Test, suggest a small, safe pilot, what to measure or observe, how to compare it with the current situation, and what result would count as success. Treat the recommendation as a proposal until it is tested; never call an untested idea proven. Keep every section concise and non-repetitive. Do not invent statistics or named organizations. Ask one brief clarification only if missing information makes a useful or safe recommendation impossible.`;

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

const TRAVEL_CONTEXT_PATTERN =
  /\b(?:travel|trip|holiday|vacation|destination|tourism|tourist|itinerary|visa|passport|flight|flights|hotel|resort|tour|war|conflict|safety|safe)\b/i;

export function getChatSystem(messages: InMessage[]) {
  const recentContext = messages.slice(-8).map((message) => message.content).join("\n");
  return TRAVEL_CONTEXT_PATTERN.test(recentContext) ? `${CHAT_SYSTEM}\n\n${TRAVEL_SYSTEM}` : CHAT_SYSTEM;
}

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

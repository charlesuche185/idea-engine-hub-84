import { supabase } from "@/integrations/supabase/client";

const SENTINEL = "\u0000[[SOLVEX_ERROR]]";
export const AI_ERROR = "Something went wrong while connecting to the AI. Please try again.";

export class AIError extends Error {}

function friendly(status?: number) {
  if (status === 429) return "Solve X has reached its free AI limit for now. Please wait a few minutes and try again (the daily limit resets every day).";
  if (status === 402) return "The AI service has reached its usage limit. Please try again later.";
  if (status === 400 || status === 403) return "Solve X couldn't reach the AI right now. Please try again later.";
  if (status === 401) return "Please sign in again to use the AI.";
  return AI_ERROR;
}

/** POST to an AI route and stream plain text back. */
export async function streamText(
  path: string,
  body: unknown,
  onText: (full: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal: signal ?? null,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new AIError(AI_ERROR);
  }
  if (!res.ok || !res.body) throw new AIError(friendly(res.status));
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += dec.decode(value, { stream: true });
    const i = full.indexOf(SENTINEL);
    if (i >= 0) {
      const status = Number(full.slice(i + SENTINEL.length)) || undefined;
      onText(full.slice(0, i));
      throw new AIError(friendly(status));
    }
    onText(full);
  }
  if (!full.trim()) throw new AIError(AI_ERROR);
  return full;
}

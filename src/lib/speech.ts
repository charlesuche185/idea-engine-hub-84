export type SpeechResult = {
  isFinal: boolean;
  0: { transcript: string };
};

export type SpeechResultEvent = {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
};

export type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function splitRecognitionResults(results: ArrayLike<SpeechResult>) {
  const finalParts: string[] = [];
  const interimParts: string[] = [];

  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    if (!result) continue;
    const transcript = result[0]?.transcript.trim();
    if (!transcript) continue;
    (result.isFinal ? finalParts : interimParts).push(transcript);
  }

  return {
    finalText: finalParts.join(" "),
    interimText: interimParts.join(" "),
  };
}

export function createVoiceDraft(base: string, results: ArrayLike<SpeechResult>) {
  const { finalText, interimText } = splitRecognitionResults(results);
  return {
    text: appendVoiceText(base, finalText),
    interimText,
  };
}

export function appendVoiceText(base: string, spoken: string) {
  const phrase = spoken.trim();
  if (!phrase) return base;
  return `${base}${base && !/\s$/.test(base) ? " " : ""}${phrase}`;
}

export function finalizeVoiceDraft(base: string, draft: string, interim: string, cancelled: boolean) {
  return cancelled ? base : appendVoiceText(draft, interim);
}

export function getRecognition(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return W.SpeechRecognition ?? W.webkitSpeechRecognition ?? null;
}

export const MIC_BLOCKED =
  "Microphone access is blocked. Tap the lock icon in your browser's address bar, allow the microphone, then try again.";

/** Turn markdown into plain text that sounds natural when read aloud. */
export function toSpeakable(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " (code example) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[*_~>|]/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/-{3,}/g, " ")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

export function speak(text: string, onEnd?: () => void) {
  const synth = window.speechSynthesis;
  if (!synth) {
    onEnd?.();
    return false;
  }
  synth.cancel();
  // Split into sentence chunks: long utterances get cut off on Android Chrome.
  const chunks = toSpeakable(text).match(/[^.!?]+[.!?]*/g) ?? [toSpeakable(text)];
  const lang = navigator.language || "en-US";
  chunks.forEach((c, i) => {
    const u = new SpeechSynthesisUtterance(c.trim());
    u.lang = lang;
    if (i === chunks.length - 1) {
      u.onend = () => onEnd?.();
      u.onerror = () => onEnd?.();
    }
    synth.speak(u);
  });
  return true;
}

export function stopSpeaking() {
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

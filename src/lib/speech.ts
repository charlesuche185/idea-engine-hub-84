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

function normalizeTranscript(transcript: string) {
  return transcript.replace(/\s+/g, " ").trim();
}

function transcriptTokenKey(token: string) {
  return token.toLocaleLowerCase().replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "");
}

/** Remove repeated adjacent words and repeated adjacent phrases from recognition output. */
export function removeConsecutiveTranscriptDuplicates(transcript: string) {
  const words = normalizeTranscript(transcript).split(" ").filter(Boolean);
  let changed = true;

  while (changed) {
    changed = false;
    for (let size = Math.floor(words.length / 2); size >= 1; size -= 1) {
      for (let start = words.length - size * 2; start >= 0; start -= 1) {
        const first = words.slice(start, start + size);
        const second = words.slice(start + size, start + size * 2);
        if (first.every((word, index) => {
          const other = second[index];
          return other !== undefined && transcriptTokenKey(word) === transcriptTokenKey(other);
        })) {
          words.splice(start + size, size);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }

  return words.join(" ");
}

function mergeRecognitionSegments(current: string, next: string) {
  const left = removeConsecutiveTranscriptDuplicates(current).split(" ").filter(Boolean);
  const right = removeConsecutiveTranscriptDuplicates(next).split(" ").filter(Boolean);
  if (!left.length) return right.join(" ");
  if (!right.length) return left.join(" ");

  let overlap = Math.min(left.length, right.length);
  while (overlap > 0) {
    const matches = left.slice(-overlap).every((word, index) =>
      right[index] !== undefined && transcriptTokenKey(word) === transcriptTokenKey(right[index]!),
    );
    if (matches) break;
    overlap -= 1;
  }

  return removeConsecutiveTranscriptDuplicates([...left, ...right.slice(overlap)].join(" "));
}

export function splitRecognitionResults(results: ArrayLike<SpeechResult>) {
  let finalText = "";
  let interimText = "";

  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    if (!result) continue;
    const transcript = removeConsecutiveTranscriptDuplicates(result[0]?.transcript ?? "");
    if (!transcript) continue;
    if (result.isFinal) {
      finalText = mergeRecognitionSegments(finalText, transcript);
    } else {
      // Mobile engines can expose cumulative interim guesses at several indices.
      // The newest interim result represents the current utterance.
      interimText = transcript;
    }
  }

  return { finalText, interimText };
}

export function createVoiceDraft(base: string, results: ArrayLike<SpeechResult>) {
  const { finalText, interimText } = splitRecognitionResults(results);
  const finalWords = finalText.split(" ").filter(Boolean);
  const interimWords = interimText.split(" ").filter(Boolean);
  let overlap = Math.min(finalWords.length, interimWords.length);
  while (overlap > 0) {
    const matches = finalWords.slice(-overlap).every((word, index) =>
      interimWords[index] !== undefined && transcriptTokenKey(word) === transcriptTokenKey(interimWords[index]!),
    );
    if (matches) break;
    overlap -= 1;
  }
  const currentInterim = removeConsecutiveTranscriptDuplicates(interimWords.slice(overlap).join(" "));

  return {
    text: appendVoiceText(base, finalText),
    interimText: currentInterim,
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

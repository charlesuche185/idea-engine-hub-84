import { useEffect, useRef, useState } from "react";
import { Mic, X } from "lucide-react";
import { getRecognition, MIC_BLOCKED, speak, stopSpeaking, type SR } from "@/lib/speech";
import { cn } from "@/lib/utils";

type Phase = "listening" | "thinking" | "speaking" | "paused";

export function VoiceMode({ onClose, ask }: { onClose: () => void; ask: (text: string) => Promise<string | null> }) {
  const [phase, setPhase] = useState<Phase>("paused");
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const recRef = useRef<SR | null>(null);
  const alive = useRef(true);

  const listen = () => {
    const Ctor = getRecognition();
    if (!Ctor) {
      setError("Voice Mode needs Chrome on Android or a desktop browser that supports speech.");
      return;
    }
    stopSpeaking();
    setError("");
    setHeard("");
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    let finalText = "";
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]!;
        t += r[0].transcript;
        if (r.isFinal) finalText = t;
      }
      setHeard(t);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setError(MIC_BLOCKED);
    };
    rec.onend = async () => {
      recRef.current = null;
      if (!alive.current) return;
      const text = finalText.trim();
      if (!text) {
        setPhase("paused");
        return;
      }
      setPhase("thinking");
      setReply("");
      const answer = await ask(text);
      if (!alive.current) return;
      if (!answer) {
        setError("Something went wrong while connecting to the AI. Please try again.");
        setPhase("paused");
        return;
      }
      setReply(answer);
      setPhase("speaking");
      speak(answer, () => {
        if (alive.current) listen();
      });
    };
    try {
      rec.start();
      recRef.current = rec;
      setPhase("listening");
    } catch {
      setPhase("paused");
    }
  };

  useEffect(() => {
    alive.current = true;
    listen();
    return () => {
      alive.current = false;
      recRef.current?.abort();
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tapOrb = () => {
    if (phase === "listening") recRef.current?.stop();
    else if (phase === "speaking") {
      stopSpeaking();
      listen();
    } else if (phase === "paused") listen();
  };

  const label = {
    listening: "Listening… tap when you're done",
    thinking: "Thinking…",
    speaking: "Speaking… tap to interrupt",
    paused: "Tap the circle to talk",
  }[phase];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-primary text-primary-foreground" role="dialog" aria-label="Voice Mode">
      <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="font-display text-sm font-semibold">Voice Mode</span>
        <button onClick={onClose} className="flex h-11 items-center gap-1.5 rounded-full bg-primary-foreground/10 px-4 text-sm font-medium">
          <X className="h-4 w-4" /> Exit
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        <button
          onClick={tapOrb}
          aria-label={label}
          className={cn(
            "grid h-40 w-40 place-items-center rounded-full bg-signal text-signal-foreground transition-transform",
            phase === "listening" && "animate-pulse scale-105",
            phase === "thinking" && "opacity-60",
            phase === "speaking" && "scale-110",
          )}
        >
          <Mic className="h-12 w-12" />
        </button>
        <p className="text-base font-medium">{label}</p>
        <div className="max-h-48 w-full max-w-md overflow-y-auto text-sm opacity-80">
          {error ? <p className="text-signal">{error}</p> : phase === "listening" || phase === "thinking" ? heard : reply.slice(0, 600)}
        </div>
      </div>
      <p className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs opacity-60">
        Your conversation is saved in this chat. Exit any time to keep typing.
      </p>
    </div>
  );
}

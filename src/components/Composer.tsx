import { useEffect, useRef, useState } from "react";
import { ArrowUp, ImagePlus, Mic, Square, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const max = 1280;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function Composer({
  onSend,
  busy,
  onStop,
  placeholder = "Ask anything or describe a problem…",
}: {
  onSend: (text: string, image: string | null) => void;
  busy?: boolean;
  onStop?: () => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SR | null>(null);
  const baseRef = useRef("");
  const finalRef = useRef("");
  const cancelledRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }, [text]);

  useEffect(() => () => recRef.current?.abort(), []);

  const startMic = () => {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("Voice input isn't supported in this browser. Try Chrome on Android or desktop.");
      return;
    }
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = text ? text.replace(/\s*$/, " ") : "";
    finalRef.current = "";
    cancelledRef.current = false;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]!;
        if (r.isFinal) finalRef.current += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setText(baseRef.current + finalRef.current + interim);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        toast.error("Microphone access is blocked. Tap the lock icon in your browser's address bar, allow the microphone, then try again.", { duration: 8000 });
      } else if (e.error === "no-speech") {
        toast("We didn't hear anything. Try again.");
      } else if (e.error !== "aborted") {
        toast.error("Voice input stopped unexpectedly. Please try again.");
      }
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      if (cancelledRef.current) setText(baseRef.current.trimEnd());
      else setText((t) => t.replace(/\s+$/, ""));
      taRef.current?.focus();
    };
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      toast.error("Couldn't start the microphone. Please try again.");
    }
  };

  const stopMic = () => recRef.current?.stop();
  const cancelMic = () => {
    cancelledRef.current = true;
    recRef.current?.abort();
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/") || (!OK_TYPES.includes(f.type) && f.type !== "")) {
      toast.error("This image format isn't supported. Please choose another image.");
      return;
    }
    try {
      setImage(await compressImage(f));
    } catch {
      toast.error(
        f.type.includes("hei")
          ? "This image format isn't supported. Please choose another image."
          : "We couldn't upload that image. Please try again.",
      );
    }
  };

  const send = () => {
    if (busy) return;
    if (listening) stopMic();
    const t = text.trim();
    if (!t && !image) return;
    onSend(t, image);
    setText("");
    setImage(null);
  };

  return (
    <div className="rounded-2xl border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/40">
      {image && (
        <div className="relative m-1 mb-2 inline-block">
          <img src={image} alt="Attachment preview" className="h-20 w-20 rounded-lg border object-cover" />
          <button
            onClick={() => setImage(null)}
            aria-label="Remove image"
            className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {listening && (
        <div className="mx-1 mb-1 flex items-center gap-2 text-xs font-medium text-signal">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-signal" />
          </span>
          Listening… speak now
          <button onClick={cancelMic} className="ml-auto rounded-md px-2 py-1 text-muted-foreground hover:bg-secondary">
            Cancel
          </button>
          <button onClick={stopMic} className="rounded-md bg-secondary px-2 py-1 text-foreground">
            Done
          </button>
        </div>
      )}
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
            e.preventDefault();
            send();
          }
        }}
        rows={1}
        placeholder={placeholder}
        aria-label="Message"
        className="block max-h-44 w-full resize-none bg-transparent px-2 py-2 text-[15px] outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center gap-1">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Add image or photo"
          className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <button
          onClick={listening ? stopMic : startMic}
          aria-label={listening ? "Stop voice input" : "Start voice input"}
          className={cn(
            "grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground",
            listening && "bg-accent text-signal",
          )}
        >
          <Mic className="h-5 w-5" />
        </button>
        <div className="ml-auto">
          {busy ? (
            <button onClick={onStop} aria-label="Stop" className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!text.trim() && !image}
              aria-label="Send"
              className="grid h-10 w-10 place-items-center rounded-full bg-signal text-signal-foreground transition-opacity disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

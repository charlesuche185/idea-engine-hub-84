import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, History, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AIError, AI_ERROR, streamText } from "@/lib/stream";
import { AppShell } from "@/components/AppShell";
import { Composer } from "@/components/Composer";
import { Markdown } from "@/components/Markdown";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/chat")({
  validateSearch: z.object({ c: z.string().optional(), q: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Ask AI — Solve X" },
      { name: "description", content: "Chat with the Solve X AI assistant. Ask questions, upload images, or use your voice." },
      { property: "og:title", content: "Ask AI — Solve X" },
      { property: "og:description", content: "Your AI partner for turning problems into solutions." },
    ],
  }),
  component: ChatPage,
});

type Msg = { id?: string | undefined; role: "user" | "assistant"; content: string; image_url?: string | null; error?: boolean };
type Conv = { id: string; title: string; updated_at: string };

const SUGGESTIONS = [
  "Explain photosynthesis simply",
  "Give me 5 startup ideas for my town",
  "Plan a science fair project on clean water",
];

function ChatPage() {
  const { user, loading } = useAuth();
  const { c, q } = Route.useSearch();
  const nav = useNavigate({ from: "/chat" });
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [histOpen, setHistOpen] = useState(false);
  const convRef = useRef<string | undefined>(c);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const qSent = useRef(false);

  const loadConvs = useCallback(async () => {
    const { data } = await supabase.from("conversations").select("id,title,updated_at").order("updated_at", { ascending: false }).limit(50);
    setConvs(data ?? []);
  }, []);

  useEffect(() => {
    if (user) loadConvs();
  }, [user, loadConvs]);

  useEffect(() => {
    if (!user) return;
    if (c === convRef.current && msgs.length) return;
    convRef.current = c;
    if (!c) { setMsgs([]); return; }
    supabase
      .from("messages")
      .select("id,role,content,image_url")
      .eq("conversation_id", c)
      .order("created_at")
      .then(({ data }) => setMsgs((data ?? []) as Msg[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  const run = async (history: Msg[]) => {
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setMsgs([...history, { role: "assistant", content: "" }]);
    let final = "";
    try {
      final = await streamText(
        "/api/chat",
        { messages: history.map((m) => ({ role: m.role, content: m.content, image: m.image_url ?? null })) },
        (t) => setMsgs([...history, { role: "assistant", content: t }]),
        ctrl.signal,
      );
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setMsgs((m) => {
          const last = m[m.length - 1];
          final = last?.content ?? "";
          return final ? m : m.slice(0, -1);
        });
      } else {
        const message = e instanceof AIError ? e.message : AI_ERROR;
        setMsgs([...history, { role: "assistant", content: message, error: true }]);
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    if (final && convRef.current) {
      const { data } = await supabase
        .from("messages")
        .insert({ conversation_id: convRef.current, role: "assistant", content: final })
        .select("id")
        .single();
      setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, id: data?.id } : x)));
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convRef.current);
    }
  };

  const send = async (text: string, image: string | null) => {
    if (!user) return;
    let cid = convRef.current;
    if (!cid) {
      const title = (text || "Image question").slice(0, 60);
      const { data, error } = await supabase.from("conversations").insert({ title }).select("id").single();
      if (error || !data) { toast.error("Couldn't start a conversation. Please try again."); return; }
      cid = data.id;
      convRef.current = cid;
      nav({ search: { c: cid }, replace: true });
      loadConvs();
    }
    const userMsg: Msg = { role: "user", content: text, image_url: image };
    const { data: ins, error } = await supabase
      .from("messages")
      .insert({ conversation_id: cid, role: "user", content: text, image_url: image })
      .select("id")
      .single();
    if (error && image) toast.error("We couldn't upload that image. Please try again.");
    userMsg.id = ins?.id;
    const clean = msgs.filter((m) => !m.error);
    await run([...clean, userMsg]);
  };

  useEffect(() => {
    if (q && user && !qSent.current && !busy) {
      qSent.current = true;
      nav({ search: {}, replace: true });
      convRef.current = undefined;
      setMsgs([]);
      send(q, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, user]);

  const regenerate = async () => {
    const last = msgs[msgs.length - 1];
    if (!last || last.role !== "assistant") return;
    if (last.id) await supabase.from("messages").delete().eq("id", last.id);
    await run(msgs.slice(0, -1));
  };

  const newChat = () => {
    abortRef.current?.abort();
    convRef.current = undefined;
    setMsgs([]);
    nav({ search: {} });
  };

  const deleteConv = async (id: string) => {
    await supabase.from("conversations").delete().eq("id", id);
    if (id === convRef.current) newChat();
    loadConvs();
  };

  return (
    <AppShell hideNavOnMobile>
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <button onClick={() => (window.history.length > 1 ? window.history.back() : nav({ to: "/" }))} className="rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary md:hidden">
            ← Back
          </button>
          <span className="hidden text-sm font-semibold md:block">Solve X Assistant</span>
          {user && (
            <div className="flex gap-1">
              <button onClick={() => setHistOpen(true)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-secondary">
                <History className="h-4 w-4" /> History
              </button>
              <button onClick={newChat} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-secondary">
                <Plus className="h-4 w-4" /> New
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {!loading && !user ? (
            <div className="mx-auto max-w-md pt-10">
              <SignInPrompt text="Sign in to chat with Solve X. Your conversations are saved so you can come back to them." />
            </div>
          ) : msgs.length === 0 ? (
            <div className="mx-auto max-w-xl pt-8 text-center">
              <h1 className="text-2xl font-bold">What problem are we solving?</h1>
              <p className="mt-2 text-sm text-muted-foreground">Ask a question, describe a problem, add a photo, or tap the mic.</p>
              <div className="mt-6 flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s, null)} className="rounded-xl border bg-card px-4 py-3 text-left text-sm hover:border-signal">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-6">
              {msgs.map((m, i) => (
                <MessageView key={i} m={m} isLast={i === msgs.length - 1} busy={busy} onRegenerate={regenerate} />
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {user && (
          <div className="border-t bg-background px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto max-w-2xl">
              <Composer onSend={send} busy={busy} onStop={() => abortRef.current?.abort()} />
              <p className="mt-2 text-center text-[11px] text-muted-foreground">Solve X can make mistakes. Verify important facts.</p>
            </div>
          </div>
        )}
      </div>

      <Sheet open={histOpen} onOpenChange={setHistOpen}>
        <SheetContent side="left" className="w-80">
          <SheetHeader>
            <SheetTitle>Conversations</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-1 overflow-y-auto px-2">
            {convs.length === 0 && <p className="px-2 text-sm text-muted-foreground">No conversations yet.</p>}
            {convs.map((cv) => (
              <div key={cv.id} className={`group flex items-center rounded-lg ${cv.id === c ? "bg-secondary" : "hover:bg-secondary"}`}>
                <button
                  onClick={() => {
                    setHistOpen(false);
                    nav({ search: { c: cv.id } });
                  }}
                  className="flex-1 truncate px-3 py-2.5 text-left text-sm"
                >
                  {cv.title}
                </button>
                <button onClick={() => deleteConv(cv.id)} aria-label="Delete conversation" className="p-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function MessageView({ m, isLast, busy, onRegenerate }: { m: Msg; isLast: boolean; busy: boolean; onRegenerate: () => void }) {
  const [copied, setCopied] = useState(false);
  if (m.role === "user") {
    return (
      <div className="flex flex-col items-end gap-2">
        {m.image_url && <img src={m.image_url} alt="Your attachment" className="max-h-60 max-w-[75%] rounded-2xl border object-cover" />}
        {m.content && <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] text-primary-foreground">{m.content}</div>}
      </div>
    );
  }
  const thinking = !m.content && busy && isLast;
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary font-display text-xs font-bold text-signal">X</span>
      <div className="min-w-0 flex-1">
        {thinking ? (
          <div className="flex items-center gap-1 py-2" aria-label="Solve X is thinking">
            {[0, 1, 2].map((d) => (
              <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d * 150}ms` }} />
            ))}
            <span className="ml-2 text-xs text-muted-foreground">Thinking carefully…</span>
          </div>
        ) : m.error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">{m.content}</div>
        ) : (
          <Markdown>{m.content}</Markdown>
        )}
        {!thinking && !(busy && isLast) && (
          <div className="mt-2 flex gap-1 text-muted-foreground">
            {!m.error && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(m.content);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                aria-label="Copy response"
                className="rounded-md p-1.5 hover:bg-secondary hover:text-foreground"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            )}
            {isLast && (
              <button onClick={onRegenerate} aria-label="Regenerate response" className="rounded-md p-1.5 hover:bg-secondary hover:text-foreground">
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

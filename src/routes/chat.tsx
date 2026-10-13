import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, History, MoreHorizontal, Pencil, Plus, RotateCcw, Share2, Square, Trash2, Volume2 } from "lucide-react";
import { format, isToday } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AIError, AI_ERROR, streamText } from "@/lib/stream";
import { speak, stopSpeaking, toSpeakable } from "@/lib/speech";
import { AppShell } from "@/components/AppShell";
import { Composer } from "@/components/Composer";
import { Markdown } from "@/components/Markdown";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  "Our community has no clean drinking water. What can I do?",
  "Give me 5 startup ideas to solve problems in my town",
  "Plan a school project on reducing plastic waste",
];

function makeTitle(text: string) {
  const t = text.replace(/\s+/g, " ").trim().replace(/^(abeg|please|pls|hi|hello)[,!\s]+/i, "");
  if (!t) return "Image question";
  const cut = t.length > 50 ? t.slice(0, 50).replace(/\s+\S*$/, "") + "…" : t;
  return cut.charAt(0).toUpperCase() + cut.slice(1);
}

function when(d: string) {
  const date = new Date(d);
  return isToday(date) ? format(date, "h:mm a") : format(date, "d MMM");
}

function ChatPage() {
  const { user, loading } = useAuth();
  const { c, q } = Route.useSearch();
  const nav = useNavigate({ from: "/chat" });
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [histOpen, setHistOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [prefill, setPrefill] = useState<{ text: string; n: number } | null>(null);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const convRef = useRef<string | undefined>(c);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const qSent = useRef(false);
  const createdRef = useRef<string | undefined>(undefined);

  const loadConvs = useCallback(async () => {
    const { data } = await supabase.from("conversations").select("id,title,updated_at").order("updated_at", { ascending: false }).limit(50);
    setConvs(data ?? []);
  }, []);

  useEffect(() => {
    if (user) loadConvs();
  }, [user, loadConvs]);

  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    if (!user) return;
    if (c && c === createdRef.current) { convRef.current = c; return; }
    if (c === convRef.current && msgs.length) return;
    convRef.current = c;
    stopSpeaking();
    setSpeakingIdx(null);
    setEditIndex(null);
    if (!c) { setMsgs([]); return; }
    supabase
      .from("messages")
      .select("id,role,content,image_url")
      .eq("conversation_id", c)
      .order("created_at")
      .then(({ data, error }) => {
        if (error) toast.error("Couldn't load this chat. Please try again.");
        setMsgs((data ?? []) as Msg[]);
      });
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
        const partial = e instanceof AIError ? e.partial.trim() : "";
        // Keep any partial text visible, but never save it as a finished answer.
        setMsgs([
          ...history,
          { role: "assistant", content: partial ? `${partial}\n\n---\n\n⚠️ ${message}` : message, error: true },
        ]);
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    if (final && convRef.current) {
      const { data, error } = await supabase
        .from("messages")
        .insert({ conversation_id: convRef.current, role: "assistant", content: final })
        .select("id")
        .single();
      if (error) toast.error("Couldn't save the answer. Please check your connection.");
      setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, id: data?.id } : x)));
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convRef.current);
      loadConvs();
    }
  };

  const deleteRows = async (rows: Msg[]) => {
    const ids = rows.map((m) => m.id).filter((x): x is string => !!x);
    if (ids.length) await supabase.from("messages").delete().in("id", ids);
  };

  const send = async (text: string, image: string | null) => {
    if (!user) return;
    stopSpeaking();
    setSpeakingIdx(null);
    let base = msgs.filter((m) => !m.error);
    let keepImage = image;
    if (editIndex !== null) {
      // Editing: drop the edited message and everything after it, then resend.
      const original = msgs[editIndex];
      keepImage = image ?? original?.image_url ?? null;
      await deleteRows(msgs.slice(editIndex));
      base = msgs.slice(0, editIndex).filter((m) => !m.error);
      setEditIndex(null);
    }
    let cid = convRef.current;
    if (!cid) {
      const { data, error } = await supabase.from("conversations").insert({ title: makeTitle(text) }).select("id").single();
      if (error || !data) { toast.error("Couldn't start a conversation. Please try again."); return; }
      cid = data.id;
      convRef.current = cid;
      createdRef.current = cid;
      nav({ search: { c: cid }, replace: true });
      loadConvs();
    }
    const userMsg: Msg = { role: "user", content: text, image_url: keepImage };
    const { data: ins, error } = await supabase
      .from("messages")
      .insert({ conversation_id: cid, role: "user", content: text, image_url: keepImage })
      .select("id")
      .single();
    if (error) toast.error(keepImage ? "We couldn't upload that image. Please try again." : "Couldn't save your message. Please check your connection.");
    userMsg.id = ins?.id;
    await run([...base, userMsg]);
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
    stopSpeaking();
    convRef.current = undefined;
    setMsgs([]);
    setEditIndex(null);
    setHistOpen(false);
    nav({ search: {} });
  };

  const deleteConv = async (id: string) => {
    await supabase.from("conversations").delete().eq("id", id);
    if (id === convRef.current) newChat();
    loadConvs();
  };

  const startEdit = (i: number) => {
    setEditIndex(i);
    setPrefill({ text: msgs[i]?.content ?? "", n: Date.now() });
  };

  const deleteMsg = async (i: number) => {
    const m = msgs[i];
    if (!m) return;
    // Remove the question and its answer together so the history stays consistent.
    const next = msgs[i + 1];
    const rows = next && next.role === "assistant" ? [m, next] : [m];
    await deleteRows(rows);
    setMsgs((all) => all.filter((x) => !rows.includes(x)));
  };

  const toggleSpeak = (i: number) => {
    if (speakingIdx === i) {
      stopSpeaking();
      setSpeakingIdx(null);
      return;
    }
    const ok = speak(msgs[i]?.content ?? "", () => setSpeakingIdx((s) => (s === i ? null : s)));
    if (!ok) toast.error("Read aloud isn't supported in this browser.");
    else setSpeakingIdx(i);
  };

  const share = async (i: number) => {
    const content = msgs[i]?.content ?? "";
    const text = `${toSpeakable(content).length > 0 ? content : ""}\n\n— Shared from Solve X`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Solve X answer", text });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Answer copied — paste it anywhere to share");
    }
  };

  return (
    <AppShell hideNavOnMobile>
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <button onClick={() => (window.history.length > 1 ? window.history.back() : nav({ to: "/" }))} className="rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-secondary md:hidden">
            ← Back
          </button>
          <span className="hidden text-sm font-semibold md:block">Solve X Assistant</span>
          {user && (
            <div className="flex gap-1">
              <button onClick={() => setHistOpen(true)} className="flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm hover:bg-secondary">
                <History className="h-4 w-4" /> History
              </button>
              <button onClick={newChat} className="flex h-10 items-center gap-1.5 rounded-lg bg-secondary px-3 text-sm font-medium">
                <Plus className="h-4 w-4" /> New Chat
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-6">
          {!loading && !user ? (
            <div className="mx-auto max-w-md pt-10">
              <SignInPrompt text="Sign in to chat with Solve X. Your conversations are private and saved so you can come back to them." />
            </div>
          ) : msgs.length === 0 ? (
            <div className="mx-auto max-w-xl pt-8 text-center">
              <h1 className="text-2xl font-bold">What problem are we solving?</h1>
              <p className="mt-2 text-sm text-muted-foreground">Type → Send, or tap 🎤 to speak, check the words, then send.</p>
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
              {msgs.map((m, i) =>
                m.role === "user" ? (
                  <UserMessage key={m.id ?? i} m={m} editing={editIndex === i} disabled={busy} onEdit={() => startEdit(i)} onDelete={() => deleteMsg(i)} />
                ) : (
                  <AssistantMessage
                    key={m.id ?? i}
                    m={m}
                    isLast={i === msgs.length - 1}
                    busy={busy}
                    speaking={speakingIdx === i}
                    onSpeak={() => toggleSpeak(i)}
                    onShare={() => share(i)}
                    onRegenerate={regenerate}
                  />
                ),
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {user && (
          <div className="border-t bg-background px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
            <div className="mx-auto max-w-2xl">
              <Composer
                onSend={send}
                busy={busy}
                onStop={() => abortRef.current?.abort()}
                prefill={prefill}
                editing={editIndex !== null}
                onCancelEdit={() => setEditIndex(null)}
              />
              <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Solve X can make mistakes. Verify important facts.</p>
            </div>
          </div>
        )}
      </div>

      <Sheet open={histOpen} onOpenChange={setHistOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-80">
          <SheetHeader>
            <SheetTitle>Chat History</SheetTitle>
          </SheetHeader>
          <div className="px-3">
            <button onClick={newChat} className="flex h-11 w-full items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-secondary">
              <Plus className="h-4 w-4" /> New Chat
            </button>
          </div>
          <div className="mt-3 space-y-1 overflow-y-auto px-2">
            {convs.length === 0 && <p className="px-2 text-sm text-muted-foreground">No conversations yet.</p>}
            {convs.map((cv) => (
              <div key={cv.id} className={`flex items-center rounded-lg ${cv.id === c ? "bg-secondary" : "hover:bg-secondary"}`}>
                <button
                  onClick={() => {
                    setHistOpen(false);
                    nav({ search: { c: cv.id } });
                  }}
                  className="min-w-0 flex-1 px-3 py-2.5 text-left"
                >
                  <span className="block truncate text-sm">{cv.title}</span>
                  <span className="block text-[11px] text-muted-foreground">{when(cv.updated_at)}</span>
                </button>
                <button onClick={() => deleteConv(cv.id)} aria-label="Delete conversation" className="grid h-10 w-10 place-items-center text-muted-foreground hover:text-destructive">
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

function UserMessage({ m, editing, disabled, onEdit, onDelete }: { m: Msg; editing: boolean; disabled: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex flex-col items-end gap-2">
      {m.image_url && <img src={m.image_url} alt="Your attachment" className="max-h-60 max-w-[75%] rounded-2xl border object-cover" />}
      {m.content && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={disabled}>
            <button
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-left text-[15px] text-primary-foreground ${editing ? "ring-2 ring-signal" : ""}`}
              aria-label="Message options"
            >
              {m.content}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onEdit} className="py-2.5"><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Copied"); }} className="py-2.5">
              <Copy className="mr-2 h-4 w-4" /> Copy
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="py-2.5 text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function AssistantMessage({
  m, isLast, busy, speaking, onSpeak, onShare, onRegenerate,
}: { m: Msg; isLast: boolean; busy: boolean; speaking: boolean; onSpeak: () => void; onShare: () => void; onRegenerate: () => void }) {
  const [copied, setCopied] = useState(false);
  const thinking = !m.content && busy && isLast;
  const btn = "grid h-9 w-9 place-items-center rounded-md hover:bg-secondary hover:text-foreground";
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
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
            <Markdown>{m.content}</Markdown>
            {isLast && (
              <button onClick={onRegenerate} className="mt-2 flex h-9 items-center gap-1.5 rounded-lg bg-background px-3 font-medium">
                <RotateCcw className="h-4 w-4" /> Try again
              </button>
            )}
          </div>
        ) : (
          <Markdown linkCards={!(busy && isLast)}>{m.content}</Markdown>
        )}
        {!thinking && !m.error && !(busy && isLast) && (
          <div className="-ml-2 mt-1 flex text-muted-foreground">
            <button
              onClick={() => { navigator.clipboard.writeText(m.content); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              aria-label="Copy response"
              className={btn}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <button onClick={onSpeak} aria-label={speaking ? "Stop reading" : "Read aloud"} className={`${btn} ${speaking ? "text-signal" : ""}`}>
              {speaking ? <Square className="h-4 w-4 fill-current" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button onClick={onShare} aria-label="Share response" className={btn}>
              <Share2 className="h-4 w-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="More options" className={btn}><MoreHorizontal className="h-4 w-4" /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {isLast && <DropdownMenuItem onClick={onRegenerate} className="py-2.5"><RotateCcw className="mr-2 h-4 w-4" /> Regenerate</DropdownMenuItem>}
                <DropdownMenuItem onClick={onSpeak} className="py-2.5"><Volume2 className="mr-2 h-4 w-4" /> {speaking ? "Stop reading" : "Read aloud"}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}

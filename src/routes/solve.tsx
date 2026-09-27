import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AIError, AI_ERROR, streamText } from "@/lib/stream";
import { CATEGORIES, extractSection, extractTitle } from "@/lib/constants";
import { AppShell } from "@/components/AppShell";
import { Markdown } from "@/components/Markdown";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/solve")({
  head: () => ({
    meta: [
      { title: "Solve a Problem — Solve X" },
      { name: "description", content: "Describe a real-world problem and get causes, solution ideas and a step-by-step project plan." },
      { property: "og:title", content: "Solve a Problem — Solve X" },
      { property: "og:description", content: "Turn a real problem into a practical project plan." },
    ],
  }),
  component: SolvePage,
});

function SolvePage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [problem, setProblem] = useState("");
  const [category, setCategory] = useState<string>("Education");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const ctrl = useRef<AbortController | null>(null);

  const analyze = async () => {
    if (problem.trim().length < 5) return toast("Please describe the problem in a bit more detail.");
    setBusy(true);
    setSaved(false);
    setResult("");
    ctrl.current = new AbortController();
    try {
      await streamText("/api/solve", { problem, category }, setResult, ctrl.current.signal);
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error(e instanceof AIError ? e.message : AI_ERROR);
    }
    setBusy(false);
  };

  const save = async () => {
    const title = extractTitle(result) ?? problem.slice(0, 70);
    const { data, error } = await supabase
      .from("problems")
      .insert({ title: problem.slice(0, 90), description: problem, category, analysis: result })
      .select("id")
      .single();
    if (error || !data) return toast.error("Couldn't save. Please try again.");
    const summary = extractSection(result, "Recommended Project Direction")?.slice(0, 400) ?? "";
    const { data: idea } = await supabase
      .from("ideas")
      .insert({ title, summary: summary || problem, category, details: result, problem_id: data.id })
      .select("id")
      .single();
    if (idea) await supabase.from("saved_items").insert([{ item_type: "problem", item_id: data.id }, { item_type: "idea", item_id: idea.id }]);
    setSaved(true);
    toast.success("Problem and idea saved to your profile");
    nav({ to: "/problems/$id", params: { id: data.id } });
  };

  return (
    <AppShell>
      <div className="px-5 py-8">
        <h1 className="text-3xl font-bold">Solve a Problem</h1>
        <p className="mt-2 text-sm text-muted-foreground">Describe a real problem. Solve X will analyze it and build a project plan.</p>
        {!loading && !user ? (
          <div className="mt-6"><SignInPrompt text="Sign in to analyze problems and save your projects." /></div>
        ) : (
          <div className="mt-6 space-y-4">
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={5}
              placeholder="e.g. Students in my community don't have reliable electricity for studying at night."
              className="w-full rounded-2xl border bg-card p-4 text-[15px] outline-none focus:ring-2 focus:ring-ring/40"
            />
            <div>
              <p className="mb-2 text-sm font-medium">Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c} onClick={() => setCategory(c)} className={`rounded-full border px-3 py-1.5 text-sm ${category === c ? "border-signal bg-accent text-accent-foreground" : "bg-card"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={analyze} disabled={busy} className="h-12 flex-1 bg-signal text-base text-signal-foreground hover:bg-signal/90">
                {busy ? "Analyzing…" : "Analyze problem"}
              </Button>
              {busy && <Button variant="outline" className="h-12" onClick={() => ctrl.current?.abort()}>Stop</Button>}
            </div>
          </div>
        )}
        {result && (
          <div className="mt-8 rounded-2xl border bg-card p-5">
            <Markdown>{result}</Markdown>
            {!busy && !saved && (
              <Button onClick={save} className="mt-6 w-full">Save problem & idea</Button>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

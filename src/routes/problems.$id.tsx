import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AIError, AI_ERROR, streamText } from "@/lib/stream";
import { AppShell } from "@/components/AppShell";
import { Markdown } from "@/components/Markdown";
import { SaveButton } from "@/components/SaveButton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/problems/$id")({
  head: () => ({
    meta: [
      { title: "Problem — Solve X" },
      { name: "description", content: "A real-world problem and its AI-assisted analysis on Solve X." },
      { property: "og:title", content: "Problem — Solve X" },
      { property: "og:description", content: "See the problem, causes and solution ideas." },
    ],
  }),
  component: ProblemPage,
});

type P = { id: string; title: string; description: string; category: string; analysis: string | null; is_sample: boolean; user_id: string | null };

function ProblemPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [p, setP] = useState<P | null | undefined>(undefined);
  const [analysis, setAnalysis] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("problems").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setP(data);
      setAnalysis(data?.analysis ?? "");
    });
  }, [id]);

  const analyze = async () => {
    if (!p) return;
    if (!user) { toast("Sign in to analyze problems with AI."); return; }
    setBusy(true);
    try {
      const full = await streamText("/api/solve", { problem: p.description, category: p.category }, setAnalysis);
      if (p.user_id === user.id) await supabase.from("problems").update({ analysis: full }).eq("id", p.id);
    } catch (e) {
      toast.error(e instanceof AIError ? e.message : AI_ERROR);
    }
    setBusy(false);
  };

  return (
    <AppShell>
      <div className="px-5 py-8">
        <Link to="/problems" className="text-sm text-muted-foreground">← All problems</Link>
        {p === undefined && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
        {p === null && <p className="mt-6">This problem wasn't found.</p>}
        {p && (
          <>
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{p.category}</span>
                {p.is_sample && <span className="ml-1.5 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">Example</span>}
                <h1 className="mt-3 text-2xl font-bold">{p.title}</h1>
              </div>
              <SaveButton type="problem" id={p.id} />
            </div>
            <p className="mt-3 text-muted-foreground">{p.description}</p>
            <div className="mt-6 rounded-2xl border bg-card p-5">
              {analysis ? <Markdown>{analysis}</Markdown> : (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">No analysis yet.</p>
                  <Button onClick={analyze} disabled={busy} className="mt-3 bg-signal text-signal-foreground hover:bg-signal/90">
                    {busy ? "Analyzing…" : "Analyze with Solve X"}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

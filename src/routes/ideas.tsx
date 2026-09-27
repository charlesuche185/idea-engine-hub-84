import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Markdown } from "@/components/Markdown";
import { SaveButton } from "@/components/SaveButton";

export const Route = createFileRoute("/ideas")({
  head: () => ({
    meta: [
      { title: "Ideas — Solve X" },
      { name: "description", content: "Explore AI-generated project and solution ideas from the Solve X community." },
      { property: "og:title", content: "Ideas — Solve X" },
      { property: "og:description", content: "Project ideas that turn problems into solutions." },
    ],
  }),
  component: IdeasPage,
});

type I = { id: string; title: string; summary: string; category: string; details: string | null; is_sample: boolean };

function IdeasPage() {
  const [items, setItems] = useState<I[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    supabase.from("ideas").select("id,title,summary,category,details,is_sample").order("created_at", { ascending: false }).limit(100).then(({ data }) => setItems(data ?? []));
  }, []);
  return (
    <AppShell>
      <div className="px-5 py-8">
        <h1 className="text-3xl font-bold">Ideas</h1>
        <p className="mt-2 text-sm text-muted-foreground">Project and solution ideas generated with Solve X.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {items === null && <p className="text-sm text-muted-foreground">Loading…</p>}
          {items?.map((i) => (
            <div key={i.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-medium">{i.category}</span>
                  {i.is_sample && <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">Example</span>}
                </div>
                <SaveButton type="idea" id={i.id} className="-mr-2 -mt-2" />
              </div>
              <h2 className="mt-2 font-semibold">{i.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{i.summary}</p>
              {i.details && (
                <button onClick={() => setOpen(open === i.id ? null : i.id)} className="mt-3 text-sm font-medium text-signal">
                  {open === i.id ? "Hide full plan" : "View full plan"}
                </button>
              )}
              {open === i.id && i.details && <div className="mt-3 border-t pt-3"><Markdown>{i.details}</Markdown></div>}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

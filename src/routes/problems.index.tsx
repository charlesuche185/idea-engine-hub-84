import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/lib/constants";
import { AppShell } from "@/components/AppShell";
import { SaveButton } from "@/components/SaveButton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/problems/")({
  validateSearch: z.object({ category: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Problems — Solve X" },
      { name: "description", content: "Browse real-world problems shared by the Solve X community." },
      { property: "og:title", content: "Problems — Solve X" },
      { property: "og:description", content: "Real problems waiting for solutions." },
    ],
  }),
  component: ProblemsPage,
});

type P = { id: string; title: string; description: string; category: string; is_sample: boolean };

function ProblemsPage() {
  const { category } = Route.useSearch();
  const [items, setItems] = useState<P[] | null>(null);
  useEffect(() => {
    let q = supabase.from("problems").select("id,title,description,category,is_sample").order("created_at", { ascending: false }).limit(100);
    if (category) q = q.eq("category", category);
    q.then(({ data }) => setItems(data ?? []));
  }, [category]);

  return (
    <AppShell>
      <div className="px-5 py-8">
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-3xl font-bold">Problems</h1>
          <Button asChild size="sm" className="bg-signal text-signal-foreground hover:bg-signal/90"><Link to="/solve">+ New</Link></Button>
        </div>
        <div className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1">
          <Link to="/problems" search={{}} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${!category ? "border-signal bg-accent" : "bg-card"}`}>All</Link>
          {CATEGORIES.map((c) => (
            <Link key={c} to="/problems" search={{ category: c }} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${category === c ? "border-signal bg-accent" : "bg-card"}`}>{c}</Link>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {items === null && <p className="text-sm text-muted-foreground">Loading…</p>}
          {items?.length === 0 && <p className="text-sm text-muted-foreground">No problems in this category yet.</p>}
          {items?.map((p) => (
            <Link key={p.id} to="/problems/$id" params={{ id: p.id }} className="rounded-2xl border bg-card p-4 transition-colors hover:border-signal">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-medium">{p.category}</span>
                  {p.is_sample && <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">Example</span>}
                </div>
                <SaveButton type="problem" id={p.id} className="-mr-2 -mt-2" />
              </div>
              <h2 className="mt-2 font-semibold">{p.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

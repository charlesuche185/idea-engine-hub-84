import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Solve X" },
      { name: "description", content: "Your Solve X profile, saved problems, saved ideas and settings." },
      { property: "og:title", content: "Profile — Solve X" },
      { property: "og:description", content: "Your saved problems and ideas." },
    ],
  }),
  component: ProfilePage,
});

type Item = { id: string; title: string };

function ProfilePage() {
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [problems, setProblems] = useState<Item[]>([]);
  const [ideas, setIdeas] = useState<Item[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle().then(({ data }) => setName(data?.display_name ?? ""));
    supabase.from("saved_items").select("item_type,item_id").then(async ({ data }) => {
      const pids = (data ?? []).filter((d) => d.item_type === "problem").map((d) => d.item_id);
      const iids = (data ?? []).filter((d) => d.item_type === "idea").map((d) => d.item_id);
      if (pids.length) supabase.from("problems").select("id,title").in("id", pids).then(({ data: p }) => setProblems(p ?? []));
      if (iids.length) supabase.from("ideas").select("id,title").in("id", iids).then(({ data: i }) => setIdeas(i ?? []));
    });
  }, [user]);

  const saveName = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: name });
    if (error) toast.error("Couldn't save. Please try again.");
    else toast.success("Profile updated");
  };

  return (
    <AppShell>
      <div className="px-5 py-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        {!loading && !user ? (
          <div className="mt-6"><SignInPrompt text="Sign in to see your saved problems, ideas and settings." /></div>
        ) : user && (
          <div className="mt-6 space-y-8">
            <section className="rounded-2xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <label className="mt-4 block text-sm font-medium">Display name</label>
              <div className="mt-2 flex gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
                <Button onClick={saveName} className="h-11">Save</Button>
              </div>
            </section>
            <section>
              <h2 className="font-semibold">Saved problems</h2>
              <div className="mt-3 space-y-2">
                {problems.length === 0 && <p className="text-sm text-muted-foreground">Nothing saved yet.</p>}
                {problems.map((p) => (
                  <Link key={p.id} to="/problems/$id" params={{ id: p.id }} className="block rounded-xl border bg-card px-4 py-3 text-sm hover:border-signal">{p.title}</Link>
                ))}
              </div>
            </section>
            <section>
              <h2 className="font-semibold">Saved ideas</h2>
              <div className="mt-3 space-y-2">
                {ideas.length === 0 && <p className="text-sm text-muted-foreground">Nothing saved yet.</p>}
                {ideas.map((i) => (
                  <Link key={i.id} to="/ideas" className="block rounded-xl border bg-card px-4 py-3 text-sm hover:border-signal">{i.title}</Link>
                ))}
              </div>
            </section>
            <Button variant="outline" className="w-full" onClick={() => supabase.auth.signOut()}>Sign out</Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

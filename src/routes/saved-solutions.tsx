import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowUpRight, BookmarkCheck, BookOpenText, LoaderCircle, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Markdown } from "@/components/Markdown";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";

type SavedSolution = Tables<"saved_solutions">;

export const Route = createFileRoute("/saved-solutions")({
  head: () => ({
    meta: [
      { title: "Saved solutions — Solve X" },
      { name: "description", content: "Your library of practical answers from Solve X." },
    ],
  }),
  component: SavedSolutionsPage,
});

function SavedSolutionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<SavedSolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<SavedSolution | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSolutions = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    const { data, error: queryError } = await supabase
      .from("saved_solutions")
      .select("id,user_id,source_message_id,title,answer,created_at")
      .order("created_at", { ascending: false });
    if (queryError) {
      setError(true);
      setItems([]);
    } else {
      setItems(data ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) void loadSolutions();
  }, [authLoading, loadSolutions]);

  const deleteSolution = async (item: SavedSolution) => {
    setDeletingId(item.id);
    const { error: deleteError } = await supabase
      .from("saved_solutions")
      .delete()
      .eq("id", item.id);
    if (deleteError) {
      toast.error("Couldn't remove this solution. Please try again.");
      setDeletingId(null);
      return;
    }
    setItems((current) => current.filter((solution) => solution.id !== item.id));
    if (selected?.id === item.id) setSelected(null);
    setConfirmDeleteId(null);
    setDeletingId(null);
    toast.success("Solution removed from your library");
  };

  const isSignedIn = Boolean(user);

  return (
    <AppShell>
      <div className="px-4 pb-12 pt-8 md:px-8 md:pt-12">
        <header className="mb-8 flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-signal">
              Your library
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Saved solutions
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Keep the useful answers close. Your saved work is private to your account.
            </p>
          </div>
          {isSignedIn && !loading && !error && items.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookmarkCheck className="h-4 w-4 text-signal" />
              <span>
                {items.length} {items.length === 1 ? "solution" : "solutions"}
              </span>
            </div>
          )}
        </header>

        {authLoading || loading ? (
          <div className="space-y-3" aria-label="Loading saved solutions">
            {[0, 1, 2].map((item) => (
              <div key={item} className="animate-pulse rounded-2xl border bg-card p-5">
                <div className="h-3 w-28 rounded bg-muted" />
                <div className="mt-4 h-5 w-3/4 rounded bg-muted" />
                <div className="mt-3 h-3 w-full rounded bg-muted" />
                <div className="mt-2 h-3 w-2/3 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : !user ? (
          <div className="mx-auto max-w-lg pt-5">
            <SignInPrompt text="Sign in to keep your practical answers in one private place." />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6">
            <p className="font-semibold">Your solutions didn’t load</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check your connection, then try again.
            </p>
            <Button onClick={() => void loadSolutions()} variant="outline" className="mt-4">
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border bg-card px-6 py-12 text-center sm:px-10">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-signal">
              <BookOpenText className="h-6 w-6" />
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold">
              A good answer is worth keeping
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Save a completed answer from your AI chat and it will be waiting here whenever you
              need it.
            </p>
            <Button asChild className="mt-6 bg-signal text-signal-foreground hover:bg-signal/90">
              <Link to="/chat">
                Ask Solve X <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <article
                key={item.id}
                className="group relative overflow-hidden rounded-2xl border bg-card transition-colors hover:border-signal/40"
                style={{ animationDelay: `${Math.min(index * 45, 270)}ms` }}
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-signal/70" />
                <div className="flex flex-col gap-4 p-4 pl-5 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:pl-6">
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className="min-w-0 flex-1 text-left"
                    aria-label={`Read ${item.title}`}
                  >
                    <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      <BookmarkCheck className="h-3.5 w-3.5 text-signal" />
                      Saved {format(new Date(item.created_at), "d MMM yyyy")}
                    </span>
                    <span className="mt-2 block truncate font-display text-base font-semibold leading-snug sm:text-lg">
                      {item.title}
                    </span>
                    <span className="mt-1.5 block line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {item.answer
                        .replace(/[#>*_`~]/g, "")
                        .replace(/\s+/g, " ")
                        .trim()}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                    {confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-2">
                        <span className="mr-1 text-xs text-muted-foreground">
                          Remove this answer?
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deletingId === item.id}
                        >
                          Keep
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void deleteSolution(item)}
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            "Remove"
                          )}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => setSelected(item)}>
                          <BookOpenText className="h-4 w-4" /> Read
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${item.title}`}
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader className="border-b pb-5 pr-10 text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal">
                  Saved solution
                </p>
                <SheetTitle className="pt-1 font-display text-xl leading-snug">
                  {selected.title}
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  Saved {format(new Date(selected.created_at), "d MMMM yyyy 'at' h:mm a")}
                </p>
              </SheetHeader>
              <div className="px-4 pb-8 pt-5 sm:px-6">
                <Markdown linkCards>{selected.answer}</Markdown>
                <div className="mt-8 border-t pt-5">
                  <Button
                    variant="outline"
                    onClick={() => setSelected(null)}
                    className="w-full sm:w-auto"
                  >
                    <X className="h-4 w-4" /> Close answer
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

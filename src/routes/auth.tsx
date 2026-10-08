import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PasswordInput } from "@/components/PasswordInput";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Solve X" },
      { name: "description", content: "Sign in to Solve X to save problems, ideas and AI conversations." },
      { property: "og:title", content: "Sign in — Solve X" },
      { property: "og:description", content: "Sign in to save your problems, ideas and chats." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user) nav({ to: "/profile" });
  }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) toast.error(error.message);
      else setSent(true);
    }
    setBusy(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in didn't complete. Please try again.");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-sm px-5 py-12">
        <h1 className="text-3xl font-bold">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Save problems, ideas and your AI conversations.</p>
        {sent ? (
          <div className="mt-8 rounded-2xl border bg-card p-5 text-sm">
            Check your email to confirm your account, then come back and sign in.
          </div>
        ) : (
          <>
            <Button variant="outline" className="mt-8 h-11 w-full" onClick={google}>
              Continue with Google
            </Button>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={submit} className="space-y-3">
              <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
              <PasswordInput required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              {mode === "in" && (
                <div className="text-right">
                  <Link to="/forgot-password" className="inline-block py-1 text-sm font-medium text-signal">
                    Forgot password?
                  </Link>
                </div>
              )}
              <Button disabled={busy} className="h-12 w-full bg-signal text-signal-foreground hover:bg-signal/90">
                {mode === "in" ? "Sign in" : "Sign up"}
              </Button>
            </form>
            <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-5 w-full text-center text-sm text-muted-foreground">
              {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
            </button>
          </>
        )}
      </div>
    </AppShell>
  );
}

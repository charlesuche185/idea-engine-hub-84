import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Create a new password — Solve X" },
      { name: "description", content: "Create a new password for your Solve X account." },
      { property: "og:title", content: "Create a new password — Solve X" },
      { property: "og:description", content: "Choose a new Solve X password." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && isRecovery)) setReady(true);
    });
    supabase.auth.getSession().then(({ data: d }) => {
      if (d.session) setReady(true);
      else if (!isRecovery) setReady(false);
    });
    const t = setTimeout(() => setReady((r) => r ?? false), 4000);
    return () => {
      data.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return void toast.error("Your password needs at least 6 characters.");
    if (pw !== pw2) return void toast.error("The two passwords are not the same. Please try again.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setBusy(false);
      return void toast.error("We couldn't change your password. The link may have expired. Please ask for a new one.");
    }
    await supabase.auth.signOut();
    setBusy(false);
    setDone(true);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-sm px-5 py-12">
        {done ? (
          <div className="text-center">
            <h1 className="text-3xl font-bold">All set!</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Your password has been changed successfully. You can now log in with your new password.
            </p>
            <Button asChild className="mt-6 h-12 w-full bg-signal text-signal-foreground hover:bg-signal/90">
              <Link to="/auth">Go to Login</Link>
            </Button>
          </div>
        ) : ready === false ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold">This link doesn't work</h1>
            <p className="mt-3 text-sm text-muted-foreground">It may be old or already used. Please ask for a new reset link.</p>
            <Button asChild className="mt-6 h-12 w-full"><Link to="/forgot-password">Get a new link</Link></Button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold">Create a new password</h1>
            <p className="mt-3 text-sm text-muted-foreground">Choose a password with at least 6 characters.</p>
            <form onSubmit={submit} className="mt-6 space-y-3">
              <PasswordInput required minLength={6} placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
              <PasswordInput required minLength={6} placeholder="Confirm new password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              <Button disabled={busy || ready === null} className="h-12 w-full bg-signal text-signal-foreground hover:bg-signal/90">
                {busy ? "Saving…" : "Create new password"}
              </Button>
            </form>
          </>
        )}
      </div>
    </AppShell>
  );
}

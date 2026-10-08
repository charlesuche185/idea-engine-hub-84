import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — Solve X" },
      { name: "description", content: "Get a link to create a new password for your Solve X account." },
      { property: "og:title", content: "Forgot password — Solve X" },
      { property: "og:description", content: "Reset your Solve X password." },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) toast.error("We couldn't send the link. Please check your email and try again.");
    else setSent(true);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-sm px-5 py-12">
        <h1 className="text-3xl font-bold">Forgot your password?</h1>
        {sent ? (
          <div className="mt-6 rounded-2xl border bg-card p-5 text-sm">
            Done! If an account uses <strong>{email}</strong>, we sent it a link. Open your email and tap the link to create a new password.
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Enter the email address you used to create your Solve X account. We will send you instructions to create a new password.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-3">
              <Input type="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
              <Button disabled={busy} className="h-12 w-full bg-signal text-signal-foreground hover:bg-signal/90">
                {busy ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          </>
        )}
        <Link to="/auth" className="mt-6 block py-2 text-center text-sm text-muted-foreground">
          ← Back to login
        </Link>
      </div>
    </AppShell>
  );
}

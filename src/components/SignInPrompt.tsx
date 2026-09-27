import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function SignInPrompt({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border bg-card p-6 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button asChild className="mt-4 bg-signal text-signal-foreground hover:bg-signal/90">
        <Link to="/auth">Sign in to continue</Link>
      </Button>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Hammer, MessageSquare, PenLine } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Solve X — Turn Problems Into Solutions" },
      { name: "description", content: "Describe a real problem. Solve X helps you understand it, explore ideas, and turn your thinking into a practical project." },
      { property: "og:title", content: "Solve X — Turn Problems Into Solutions" },
      { property: "og:description", content: "An AI innovation platform for students, innovators and entrepreneurs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const STEPS = [
  { icon: PenLine, title: "Describe the problem", text: "Tell Solve X about a real challenge in your school, farm, business or community." },
  { icon: Compass, title: "Explore possible solutions", text: "Get causes, ideas and a recommended direction — clearly and honestly explained." },
  { icon: Hammer, title: "Build the idea", text: "Follow a step-by-step plan with materials, challenges and improvements." },
];

function Home() {
  return (
    <AppShell>
      <section className="px-5 pb-10 pt-10 md:pt-20">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-signal" /> AI innovation platform
        </div>
        <h1 className="mt-5 max-w-3xl text-[2.6rem] font-extrabold leading-[1.05] md:text-7xl">
          Turn Problems <br className="hidden sm:block" />
          Into <span className="text-signal">Solutions.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
          Describe a real problem. Solve X helps you understand it, explore ideas, and turn your thinking into a practical project.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 bg-signal text-base text-signal-foreground hover:bg-signal/90">
            <Link to="/chat">
              Solve a Problem <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 text-base">
            <Link to="/chat">
              <MessageSquare className="mr-1 h-4 w-4" /> Ask AI
            </Link>
          </Button>
        </div>
      </section>

      <section className="px-5 pb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">How Solve X works</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="font-display text-sm font-bold text-signal">0{i + 1}</span>
                <s.icon className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="px-5 pb-12">
        <div className="rounded-2xl bg-primary p-6 text-primary-foreground md:p-10">
          <p className="text-sm opacity-70">Try asking</p>
          <p className="mt-2 font-display text-xl font-semibold md:text-2xl">
            “How can I reduce post-harvest food waste in Nigerian villages?”
          </p>
          <Button asChild className="mt-5 bg-signal text-signal-foreground hover:bg-signal/90">
            <Link to="/chat" search={{ q: "How can I reduce post-harvest food waste in Nigerian villages?" }}>
              Ask Solve X
            </Link>
          </Button>
        </div>
      </section>

      <section className="px-5 pb-12">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Explore by category</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Link key={c} to="/problems" search={{ category: c }} className="rounded-full border bg-card px-4 py-2 text-sm font-medium hover:border-signal">
              {c}
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

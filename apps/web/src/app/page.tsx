import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { WidgetPlayground } from "@/components/marketing/widget-playground";
import { ArrowRight, Bolt, Code, Gauge, Globe, Layers, Message, Rocket, Shield } from "@/components/icons";

const SNIPPET = `<script src="https://shiplog.dev/widget.js"
        data-shiplog-key="pk_live_..." defer></script>`;

const STEPS = [
  { icon: Message, title: "Users suggest", body: "A small launcher in the corner of your app. Ideas arrive with the page they came from." },
  { icon: Layers, title: "Everyone votes", body: "One vote per person, enforced by the database. The board sorts itself by demand." },
  { icon: Rocket, title: "You ship & tell them", body: "Move an idea to Shipped and the people who asked can see it, right where they asked." },
];

const FEATURES = [
  { icon: Code, title: "One script tag", body: "No SDK, no build step. Paste it before </body> and you're live." },
  { icon: Shield, title: "Shadow DOM isolation", body: "Your CSS can't break the widget, and the widget can't break yours." },
  { icon: Bolt, title: "~9 KB gzipped", body: "Preact under the hood, with lazy loading. Nothing is fetched until the panel opens." },
  { icon: Globe, title: "Origin-locked keys", body: "Public keys only work on domains you allow, with rate limits on every write." },
  { icon: Gauge, title: "Optimistic voting", body: "Votes feel instant. If a request fails, only that item rolls back." },
  { icon: Layers, title: "Your form, your questions", body: "Add dropdowns, emails or numbers to the form. Validated on the server against your config." },
];

export default async function Home() {
  const user = await getCurrentUser();
  const cta = user ? { href: "/dashboard", label: "Open the dashboard" } : { href: "/signup", label: "Start for free" };

  return (
    <div className="min-h-screen overflow-x-clip">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 text-sm">
            <a href="#how" className="hidden rounded-md px-3 py-2 text-muted transition hover:text-foreground sm:block">
              How it works
            </a>
            <a href="#features" className="hidden rounded-md px-3 py-2 text-muted transition hover:text-foreground sm:block">
              Features
            </a>
            <a href="/demo" className="hidden rounded-md px-3 py-2 text-muted transition hover:text-foreground sm:block">
              Live demo
            </a>
            {user ? (
              <Link
                href="/dashboard"
                className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 font-medium text-background transition hover:opacity-85"
              >
                Dashboard <ArrowRight />
              </Link>
            ) : (
              <>
                <Link href="/login" className="rounded-md px-3 py-2 text-muted transition hover:text-foreground">
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 font-medium text-background transition hover:opacity-85"
                >
                  Get started <ArrowRight />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-16 pb-24 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          {/* No entrance animation here: this headline is the LCP element. */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted">
              <span className="size-1.5 rounded-full bg-accent" />
              In-app feedback, open source
            </span>
            <h1 className="mt-6 text-5xl leading-[1.02] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Hear users.
              <br />
              <span className="font-serif font-normal italic text-accent">Ship</span> what matters.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Add one script tag. Your users suggest ideas, vote, and see what ships, without ever leaving your product.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={cta.href}
                className="group inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-accent-ink shadow-[0_10px_30px_-10px_var(--accent)] transition hover:brightness-110"
              >
                {cta.label}
                <ArrowRight className="transition group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#install"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-semibold transition hover:border-foreground/30"
              >
                <Code /> Install in 30s
              </a>
            </div>
            <p className="mt-6 text-sm text-muted">
              <span className="font-medium text-foreground">Try it →</span> the widget on the right is live. Or open the{" "}
              <a href="/demo" className="font-medium text-foreground underline underline-offset-4">
                full demo app
              </a>
              .
            </p>
          </div>

          <div className="relative animate-rise [animation-delay:150ms]">
            <div className="glow absolute inset-0 -z-10 scale-90 opacity-70" />
            <WidgetPlayground />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeading eyebrow="How it works" title="A feedback loop that actually closes." />
          <div className="relative mt-12">
          <div aria-hidden="true" className="absolute top-6 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
          <ol className="relative grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative flex flex-col items-start md:items-center md:text-center">
                <span className="relative grid size-12 place-items-center rounded-2xl border border-border bg-background text-xl text-accent">
                  <s.icon />
                  <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-foreground font-mono text-[10px] text-background">
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 max-w-xs text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
          </div>
        </div>
      </section>

      {/* Install */}
      <section id="install" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <SectionHeading
            eyebrow="Install"
            title="Paste it. That's the integration."
            body="Create a project, allow your domain, drop in the tag. Works with React, Vue, Rails, WordPress, and plain HTML."
          />
          <div className="overflow-hidden rounded-2xl border border-border bg-[#0e0e10] text-[#e8e8e6] shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
              </div>
              <span className="font-mono text-xs text-white/60">index.html</span>
              <CopyButton text={SNIPPET} className="border-white/10 bg-white/5 text-white/60 hover:text-white" />
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed">
              <span className="text-white/60">{"<!-- before </body> -->"}</span>
              {"\n"}
              <span className="text-[#ff8a65]">{"<script"}</span> <span className="text-[#9ecbff]">src</span>=
              <span className="text-[#b5e8a0]">&quot;https://shiplog.dev/widget.js&quot;</span>
              {"\n        "}
              <span className="text-[#9ecbff]">data-shiplog-key</span>=<span className="text-[#b5e8a0]">&quot;pk_live_...&quot;</span>{" "}
              <span className="text-[#9ecbff]">defer</span>
              <span className="text-[#ff8a65]">{"></script>"}</span>
            </pre>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeading eyebrow="Under the hood" title="Small, fast, and hard to break." />
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="group bg-card p-6 transition hover:bg-subtle">
                <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-lg text-accent transition group-hover:scale-105">
                  <f.icon />
                </span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-foreground px-6 py-16 text-center text-background sm:px-12">
          <div className="glow absolute -top-1/2 left-1/2 h-full w-2/3 -translate-x-1/2 opacity-60" />
          <h2 className="relative text-4xl font-semibold tracking-tight sm:text-5xl">
            Stop guessing. <span className="font-serif font-normal italic">Start shipping.</span>
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-background/60">See every request, ranked by the people who want it.</p>
          <Link
            href={cta.href}
            className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-accent-ink transition hover:brightness-110"
          >
            {cta.label} <ArrowRight />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
          <Logo />
          <span>Built with Next.js, Preact, and Postgres.</span>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="max-w-2xl">
      <div className="font-mono text-xs font-medium tracking-widest text-accent uppercase">{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {body && <p className="mt-4 text-lg leading-relaxed text-muted">{body}</p>}
    </div>
  );
}

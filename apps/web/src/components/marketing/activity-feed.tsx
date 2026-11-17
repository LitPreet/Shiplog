"use client";

import { useEffect, useState } from "react";
import { ArrowUp, Check, Message } from "../icons";

// A small "live" ticker next to the hero widget that shows the product's loop
// (ideas come in, people vote, things ship). Purely decorative, so it's hidden
// from screen readers and stops cycling for reduced-motion users.

const EVENTS = [
  { icon: ArrowUp, label: "+1 vote", detail: "Recurring invoices", tone: "text-accent" },
  { icon: Message, label: "New idea", detail: "Partial payments", tone: "text-planned" },
  { icon: ArrowUp, label: "+1 vote", detail: "Export reports to Excel", tone: "text-accent" },
  { icon: Check, label: "Marked as shipped", detail: "Dark mode", tone: "text-done" },
];

export function ActivityFeed() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % EVENTS.length), 2800);
    return () => clearInterval(t);
  }, []);

  const e = EVENTS[i];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -top-16 left-4 z-10 hidden xl:block">
      {/* key={i} remounts the card so the entrance animation replays for each event */}
      <div
        key={i}
        className="animate-pop flex items-center gap-2.5 rounded-xl border border-border bg-card/95 py-2 pr-3.5 pl-2 text-sm shadow-[0_12px_30px_-12px_rgba(0,0,0,0.3)] backdrop-blur"
      >
        <span className={`grid size-7 place-items-center rounded-lg bg-subtle ${e.tone}`}>
          <e.icon />
        </span>
        <span>
          <span className="font-semibold">{e.label}</span>
          <span className="text-muted"> · {e.detail}</span>
        </span>
        <span className="relative ml-1 flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-done opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-done" />
        </span>
      </div>
    </div>
  );
}

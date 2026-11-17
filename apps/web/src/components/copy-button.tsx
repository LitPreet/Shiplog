"use client";

import { useState } from "react";
import { Check, Copy } from "./icons";

export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked (http, permissions). Nothing useful to do.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted transition hover:text-foreground ${className}`}
    >
      {copied ? <Check className="text-done" /> : <Copy />}
      {copied ? "Copied" : label}
    </button>
  );
}

import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata = { title: "Dashboard" };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo href="/dashboard" />
            <span className="rounded-md bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-muted">dashboard</span>
          </div>
          <Link href="/" className="text-sm text-muted transition hover:text-foreground">
            ← Back to site
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}

import Link from "next/link";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/auth";
import { isDemoUser } from "@/lib/demo";
import { logout } from "../(auth)/actions";

export const metadata = { title: "Dashboard" };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo href="/dashboard" />
            <span className="rounded-md bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-muted">dashboard</span>
          </div>
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-border bg-card py-1 pr-3 pl-1 text-sm transition hover:border-foreground/25 [&::-webkit-details-marker]:hidden">
              <span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-ink">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[160px] truncate font-medium sm:block">{user.name}</span>
            </summary>
            <div className="absolute right-0 mt-2 w-60 rounded-xl border border-border bg-card p-1.5 shadow-xl">
              <div className="px-2.5 py-2">
                <div className="truncate text-sm font-medium">{user.name}</div>
                <div className="truncate text-xs text-muted">{user.email}</div>
              </div>
              <div className="my-1 h-px bg-border" />
              <Link href="/" className="block rounded-lg px-2.5 py-2 text-sm text-muted transition hover:bg-subtle hover:text-foreground">
                Back to site
              </Link>
              <form action={logout}>
                <button className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-red-600 transition hover:bg-red-500/10 dark:text-red-400">
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>
      {isDemoUser(user) && (
        <div className="border-b border-accent/30 bg-accent-soft">
          <p className="mx-auto max-w-6xl px-4 py-2.5 text-sm sm:px-6">
            <strong>You&apos;re exploring the read-only demo.</strong> You can change idea statuses; settings are locked.{" "}
            <Link href="/signup" className="font-semibold underline underline-offset-4">
              Create a free account
            </Link>{" "}
            to set up your own project.
          </p>
        </div>
      )}
      {children}
    </div>
  );
}

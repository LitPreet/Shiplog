import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-4">
      <h1 className="text-4xl font-bold tracking-tight">Shiplog</h1>
      <p className="text-lg text-neutral-600 dark:text-neutral-400">
        Collect feedback inside your app with one script tag. Your users suggest and vote on ideas
        without leaving your product, and hear back when you ship them.
      </p>
      <div>
        <Link href="/dashboard" className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500">
          Open dashboard →
        </Link>
      </div>
    </main>
  );
}

import Link from "next/link";

// The mark: a loop that ends in an arrowhead (feedback goes round, ideas ship).
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <span className={`inline-grid place-items-center rounded-[9px] bg-accent text-white ${className}`}>
      <svg viewBox="0 0 24 24" className="size-[62%]" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12a7 7 0 1 1-3.2-5.9" />
        <path d="M16.5 2.8l-.7 3.3 3.3.7" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight" aria-label="Shiplog home">
      <LogoMark />
      <span className="text-[17px]">Shiplog</span>
    </Link>
  );
}

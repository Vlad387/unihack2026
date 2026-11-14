import Link from "next/link";
import { Logo } from "@/components/logo";

export function Brand({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 font-wordmark font-black tracking-[-0.03em] ${className}`}
      aria-label="CityMind, acasă"
    >
      <Logo className="size-[1.5em]" />
      <span>
        City<span className="text-[var(--cyan)]">Mind</span>
      </span>
    </Link>
  );
}

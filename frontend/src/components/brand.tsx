import Link from "next/link";
import { Logo } from "@/components/logo";

export function Brand({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`} aria-label="CityMind, acasă">
      <Logo className="size-[1.6em]" />
      <span>
        City<span className="text-primary">Mind</span>
      </span>
    </Link>
  );
}

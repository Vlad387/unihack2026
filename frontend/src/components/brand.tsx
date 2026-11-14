import Link from "next/link";
import { Logo } from "@/components/logo";
import { Wordmark } from "@/components/wordmark";

export function Brand({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className}`} aria-label="CityMind, acasă">
      <Logo className="size-[1.9em] -my-[0.2em]" />
      <Wordmark accent className="h-[1.35em] w-auto" />
    </Link>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// A menu link that knows when it is the current page: it gets a semi-transparent glass pill behind it.
// The pill has one shared view-transition-name, so on page change browsers that support view transitions
// slide it from the old link to the new one; others simply show it on the new link.
export function NavLink({ href, label, className }: { href: string; label: string; className: string }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative isolate ${className} ${active ? "font-semibold text-foreground" : ""}`}
    >
      {active && (
        <span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-lg border border-white/50 bg-[linear-gradient(135deg,oklch(58%_0.25_300/0.18),oklch(68%_0.15_235/0.18))] shadow-[0_4px_14px_-6px_oklch(45%_0.25_295/0.45)] backdrop-blur-md [view-transition-name:nav-pill]"
        />
      )}
      {label}
    </Link>
  );
}

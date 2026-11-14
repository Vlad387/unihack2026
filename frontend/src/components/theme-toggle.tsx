"use client";

import { Moon, Sun } from "lucide-react";

const KEY = "citymind-theme";

// Dark (Midnight) stays the default; the light theme is opt-in and remembered per browser.
// Both icons render and CSS picks one, so server and client HTML always match.
export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const light = document.documentElement.classList.toggle("light");
    try {
      localStorage.setItem(KEY, light ? "light" : "dark");
    } catch (err) {
      // private mode / blocked storage: the switch still works for this page view
      console.warn("theme not saved", err);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Schimbă tema (luminos / întunecat)"
      title="Schimbă tema"
      className={`grid size-10 shrink-0 place-items-center rounded-full text-ink-2 transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${className}`}
    >
      <Sun className="size-5 in-[.light]:hidden" aria-hidden />
      <Moon className="hidden size-5 in-[.light]:block" aria-hidden />
    </button>
  );
}

"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

const INTERACTIVE = "a, button, summary, [data-cursor]";

// Dot = exact pointer, ring = lagging follower that grows on anything clickable and can carry a label
// (data-cursor="…"). [data-magnetic] elements lean toward the pointer. Mouse/trackpad only: touch and
// reduced-motion users keep the native cursor.
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      const [d, r, l] = [dot.current, ring.current, label.current];
      if (!d || !r || !l) return;
      const root = document.documentElement;
      root.classList.add("has-cursor");
      gsap.set([d, r], { xPercent: -50, yPercent: -50, autoAlpha: 0 });
      const dx = gsap.quickTo(d, "x", { duration: 0.1, ease: "power3" });
      const dy = gsap.quickTo(d, "y", { duration: 0.1, ease: "power3" });
      const rx = gsap.quickTo(r, "x", { duration: 0.45, ease: "power3" });
      const ry = gsap.quickTo(r, "y", { duration: 0.45, ease: "power3" });
      let magnet: HTMLElement | null = null;

      const move = (e: PointerEvent) => {
        gsap.to([d, r], { autoAlpha: 1, duration: 0.2, overwrite: "auto" });
        dx(e.clientX);
        dy(e.clientY);
        rx(e.clientX);
        ry(e.clientY);
        const tile = (e.target as Element).closest<HTMLElement>(".tile");
        if (tile) {
          const b = tile.getBoundingClientRect();
          tile.style.setProperty("--mx", `${e.clientX - b.left}px`);
          tile.style.setProperty("--my", `${e.clientY - b.top}px`);
        }
        if (magnet) {
          // measure from the untranslated center so the pull doesn't feed back into itself
          const b = magnet.getBoundingClientRect();
          const cx = b.left + b.width / 2 - Number(gsap.getProperty(magnet, "x"));
          const cy = b.top + b.height / 2 - Number(gsap.getProperty(magnet, "y"));
          gsap.to(magnet, { x: (e.clientX - cx) * 0.3, y: (e.clientY - cy) * 0.35, duration: 0.4, ease: "power3.out" });
        }
      };
      const over = (e: PointerEvent) => {
        const el = (e.target as Element).closest<HTMLElement>(INTERACTIVE);
        if (!el) return;
        const text = el.dataset.cursor ?? "";
        l.textContent = text;
        gsap.to(r, { width: text ? 88 : 56, height: text ? 88 : 56, backgroundColor: "rgb(0 209 178 / 0.14)", duration: 0.35, ease: "power3.out" });
        gsap.to(d, { scale: 0.5, duration: 0.2 });
        magnet = el.closest<HTMLElement>("[data-magnetic]");
      };
      const out = (e: PointerEvent) => {
        const from = (e.target as Element).closest(INTERACTIVE);
        if (!from || from.contains(e.relatedTarget as Node | null)) return;
        l.textContent = "";
        gsap.to(r, { width: 36, height: 36, backgroundColor: "rgb(0 209 178 / 0)", duration: 0.35, ease: "power3.out" });
        gsap.to(d, { scale: 1, duration: 0.2 });
        if (magnet) gsap.to(magnet, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" });
        magnet = null;
      };
      const down = () => gsap.to(r, { scale: 0.85, duration: 0.15 });
      const up = () => gsap.to(r, { scale: 1, duration: 0.3, ease: "back.out(3)" });
      const leave = () => gsap.to([d, r], { autoAlpha: 0, duration: 0.2 });

      addEventListener("pointermove", move, { passive: true });
      document.addEventListener("pointerover", over);
      document.addEventListener("pointerout", out);
      addEventListener("pointerdown", down);
      addEventListener("pointerup", up);
      root.addEventListener("pointerleave", leave);
      return () => {
        root.classList.remove("has-cursor");
        removeEventListener("pointermove", move);
        document.removeEventListener("pointerover", over);
        document.removeEventListener("pointerout", out);
        removeEventListener("pointerdown", down);
        removeEventListener("pointerup", up);
        root.removeEventListener("pointerleave", leave);
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <div className="cursor" aria-hidden>
      <div
        ref={ring}
        className="fixed top-0 left-0 grid size-9 place-items-center rounded-full border border-primary/70 font-mono text-[0.62rem] tracking-[0.12em] text-primary uppercase backdrop-blur-[2px]"
      >
        <span ref={label} />
      </div>
      <div ref={dot} className="fixed top-0 left-0 size-1.5 rounded-full bg-primary" />
    </div>
  );
}

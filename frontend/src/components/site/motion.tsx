"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect } from "react";

gsap.registerPlugin(ScrollTrigger, SplitText);

/* Declarative motion for the public site: pages stay server components and only mark elements.
   data-split        hero line, revealed through a mask
   data-hero-fade    hero support content, fades up after the headline
   data-reveal       fades up once when it scrolls into view
   data-stagger      same, for each child in turn
   data-speed="n"    gentle parallax on desktop (broken-grid depth)
   data-count        number counts up once
   data-steps / data-step / data-step-link / data-steps-bar   storytelling index for the steps section */
export function Motion() {
  useEffect(() => {
    const mm = gsap.matchMedia();

    // Runs for everyone, reduced motion included: it only marks which step is in view.
    const links = gsap.utils.toArray<HTMLElement>("[data-step-link]");
    const triggers = gsap.utils.toArray<HTMLElement>("[data-step]").map((step) =>
      ScrollTrigger.create({
        trigger: step,
        start: "top 60%",
        end: "bottom 40%",
        onToggle: (self) => {
          if (self.isActive) links.forEach((l) => l.toggleAttribute("data-active", l.dataset.stepLink === step.dataset.step));
        },
      }),
    );

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // explicit end values: never trust whatever opacity/position the element happens to have right now
      const hidden = { y: 30, autoAlpha: 0 };
      const shown = { y: 0, autoAlpha: 1, ease: "power3.out" };

      gsap.utils.toArray<HTMLElement>("[data-split]").forEach((el, i) => {
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (s) => {
            gsap.set(el, { visibility: "visible" });
            return gsap.fromTo(s.lines, { yPercent: 110 }, { yPercent: 0, duration: 1.15, ease: "power4.out", stagger: 0.08, delay: i * 0.12 });
          },
        });
      });
      gsap.fromTo("[data-hero-fade]", hidden, { ...shown, duration: 1, stagger: 0.09, delay: 0.45 });

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) =>
        gsap.fromTo(el, hidden, { ...shown, duration: 0.9, scrollTrigger: { trigger: el, start: "top 88%", once: true } }),
      );
      gsap.utils.toArray<HTMLElement>("[data-stagger]").forEach((el) =>
        gsap.fromTo(el.children, hidden, {
          ...shown,
          duration: 0.8,
          stagger: 0.07,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        }),
      );
      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
        const n = { v: 0 };
        gsap.to(n, {
          v: Number(el.dataset.count),
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => void (el.textContent = Math.round(n.v).toLocaleString("ro-RO")),
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });
    });

    // scrubbed effects: desktop only, where there is room for depth and no touch-scroll jank
    mm.add("(prefers-reduced-motion: no-preference) and (min-width: 1024px)", () => {
      gsap.utils.toArray<HTMLElement>("[data-speed]").forEach((el) =>
        gsap.to(el, {
          yPercent: -8 * Number(el.dataset.speed),
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.8 },
        }),
      );
      const bar = document.querySelector("[data-steps-bar]");
      if (bar)
        gsap.fromTo(
          bar,
          { scaleY: 0 },
          { scaleY: 1, ease: "none", scrollTrigger: { trigger: "[data-steps]", start: "top 45%", end: "bottom 65%", scrub: 0.6 } },
        );
    });

    return () => {
      triggers.forEach((t) => t.kill());
      mm.revert();
    };
  }, []);

  return null;
}

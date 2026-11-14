import { Bento } from "@/components/site/bento";
import { Closing, Marquee, Statement } from "@/components/site/closing";
import { Hero } from "@/components/site/hero";
import { Motion } from "@/components/site/motion";
import { Steps } from "@/components/site/steps";
import { getBridges, getClusters, getQuestion } from "@/lib/api";

// Live data on purpose: wait for the backend so the page (and the map) arrive complete, not as an empty shell.
export const instant = false;

// Rhythm on purpose: split hero → pinned story → full-bleed band → big statement → bento → wave CTA.
export default async function LandingPage() {
  const [question, clusters, bridges] = await Promise.all([getQuestion(), getClusters(), getBridges()]);

  return (
    <>
      <Hero question={question} clusters={clusters} />
      <Steps />
      <Marquee />
      <Statement />
      <Bento clusters={clusters} bridges={bridges.length} />
      <Closing />
      {/* inside the page, not the layout: the page streams in its own Suspense boundary and GSAP
          must not touch its HTML before React has hydrated it */}
      <Motion />
    </>
  );
}

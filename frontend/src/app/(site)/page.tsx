import { Audience } from "@/components/site/audience";
import { Closing, Statement } from "@/components/site/closing";
import { Features } from "@/components/site/features";
import { Hero } from "@/components/site/hero";
import { Learn } from "@/components/site/learn";
import { LiveNow } from "@/components/site/live-now";
import { Motion } from "@/components/site/motion";
import { Proof } from "@/components/site/proof";
import { Steps } from "@/components/site/steps";
import { getBridges, getClusters, getQuestion, getSupport } from "@/lib/api";

// Live data on purpose: wait for the backend so the page (and the map) arrive complete, not as an empty shell.
export const instant = false;

// Template order: violet band (wordmark hero + built-with) → feature cards → big statement → steps →
// audience cards → big numbers → live list → ice-to-violet band (articles + purple CTA) → dark footer card.
export default async function LandingPage() {
  const [question, clusters, bridges, support] = await Promise.all([getQuestion(), getClusters(), getBridges(), getSupport()]);

  return (
    <>
      <Hero />
      <Features />
      <Statement />
      <Steps />
      <Audience />
      <Proof />
      <LiveNow question={question} clusters={clusters} bridges={bridges.length} support={support} />
      <div className="band-bottom">
        <Learn />
        <Closing />
      </div>
      {/* inside the page, not the layout: the page streams in its own Suspense boundary and GSAP
          must not touch its HTML before React has hydrated it */}
      <Motion />
    </>
  );
}

import { ViewTransition } from "react";
import { Cursor } from "@/components/site/cursor";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// Runs before paint: `js` lets the hero hide the lines GSAP is about to reveal, so they don't flash first.
const boot = `document.documentElement.classList.add("js")`;

// Public pages (landing, how it works, demo). The theme comes from the root layout; citizen flow, board and
// organizer keep their own focused layouts.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <script dangerouslySetInnerHTML={{ __html: boot }} />
      <SiteHeader />
      <ViewTransition default="site-page">
        <main className="flex flex-1 flex-col">{children}</main>
      </ViewTransition>
      <SiteFooter />
      <Cursor />
    </div>
  );
}

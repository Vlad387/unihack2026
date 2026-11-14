import { JetBrains_Mono, Plus_Jakarta_Sans, Syne } from "next/font/google";
import { ViewTransition } from "react";
import { Cursor } from "@/components/site/cursor";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const syne = Syne({ variable: "--font-syne", subsets: ["latin", "latin-ext"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin", "latin-ext"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin", "latin-ext"] });

// Runs before paint: `js` lets the hero hide the lines GSAP is about to reveal, so they don't flash first.
const boot = `document.documentElement.classList.add("js")`;

// Public pages (landing, how it works, demo). Citizen flow, board and organizer keep their own focused layouts.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`dark brand ${syne.variable} ${jakarta.variable} ${jetbrains.variable} flex flex-1 flex-col antialiased`}>
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

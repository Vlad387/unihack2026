import { ViewTransition } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// Public pages (landing, how it works, demo). The theme comes from the root layout; citizen flow, board and
// organizer keep their own focused layouts.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ViewTransition default="site-page">
        <main className="flex flex-1 flex-col">{children}</main>
      </ViewTransition>
      <SiteFooter />
    </div>
  );
}

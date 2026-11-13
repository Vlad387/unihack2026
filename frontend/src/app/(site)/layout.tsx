import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// Public pages (landing, how it works). Citizen flow, board and organizer keep their own focused layouts.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans, Syne } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const syne = Syne({ variable: "--font-syne", subsets: ["latin", "latin-ext"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin", "latin-ext"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "CityMind",
  description: "Consultare publică",
};

// One theme for every page: solid Midnight brand background (`brand`), with `dark` so dark: variants and
// the dark camp-color steps apply everywhere.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ro"
      // the public site's inline script adds `js` before React hydrates
      suppressHydrationWarning
      className={`${syne.variable} ${jakarta.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="dark brand flex min-h-full flex-col">
        {/* before paint: `js` lets the landing hero hide the lines GSAP is about to reveal, so they don't flash.
            next/script, not a raw <script>: React never runs script tags it renders on the client */}
        <Script id="boot" strategy="beforeInteractive">{`document.documentElement.classList.add("js")`}</Script>
        {children}
      </body>
    </html>
  );
}

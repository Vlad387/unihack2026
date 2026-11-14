import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono, Unbounded } from "next/font/google";
import "./globals.css";

// Unbounded: the heavy rounded wordmark face (giant "CityMind" + logo). Inter Tight: tight grotesk for
// headlines and body. JetBrains Mono: small uppercase labels.
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin", "latin-ext"], weight: ["700", "900"] });
const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin", "latin-ext"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin", "latin-ext"] });

// Light (template look) is the default and server-rendered; a saved "dark" choice removes it before first paint.
const boot = `document.documentElement.classList.add("js");try{if(localStorage.getItem("citymind-theme")==="dark")document.documentElement.classList.remove("light")}catch(e){}`;

export const metadata: Metadata = {
  title: "CityMind",
  description: "Consultare publică",
};

// One theme system for every page: `brand` tokens on <body>, `dark` keeps the dark: variants and dark camp-color
// steps; html.light (the default, toggle in the header) switches all of it to the light template palette.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ro"
      // the boot script below changes classes on <html> before React hydrates
      suppressHydrationWarning
      className={`${unbounded.variable} ${interTight.variable} ${jetbrains.variable} light h-full antialiased`}
    >
      <head>
        {/* inline, so it runs before first paint: `js` lets the landing hero hide the lines GSAP is about to
            reveal, and a saved dark theme applies with no light flash. Only in the root layout: it is never
            re-rendered on client navigation, so React's "script tag while rendering" warning can't fire
            (next/script beforeInteractive is queued until Next's JS loads, which is too late here) */}
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body className="dark brand flex min-h-full flex-col">{children}</body>
    </html>
  );
}

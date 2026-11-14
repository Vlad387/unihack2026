import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({ variable: "--font-syne", subsets: ["latin", "latin-ext"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin", "latin-ext"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin", "latin-ext"] });

const boot = `document.documentElement.classList.add("js");try{if(localStorage.getItem("citymind-theme")==="light")document.documentElement.classList.add("light")}catch(e){}`;

export const metadata: Metadata = {
  title: "CityMind",
  description: "Consultare publică",
};

// One theme for every page: solid Midnight brand background (`brand`), with `dark` so dark: variants and
// the dark camp-color steps apply everywhere. html.light (theme toggle) switches all of it to the light palette.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ro"
      // the public site's inline script adds `js` before React hydrates
      suppressHydrationWarning
      className={`${syne.variable} ${jakarta.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        {/* inline, so it runs before first paint: `js` lets the landing hero hide the lines GSAP is about to
            reveal, and a saved light theme applies with no dark flash. Only in the root layout: it is never
            re-rendered on client navigation, so React's "script tag while rendering" warning can't fire
            (next/script beforeInteractive is queued until Next's JS loads, which is too late here) */}
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body className="dark brand flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}

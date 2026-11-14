import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans, Syne } from "next/font/google";
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
      <body className="dark brand flex min-h-full flex-col">{children}</body>
    </html>
  );
}

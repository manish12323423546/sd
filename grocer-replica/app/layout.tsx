import type { Metadata, Viewport } from "next";
import { Inter, Staatliches } from "next/font/google";
import SiteRuntime from "@/components/site/runtime";
import { ALLOW_INDEXING, SITE_URL } from "@/lib/site";
import "lenis/dist/lenis.css";
import "./webflow.css";
import "./custom.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"], variable: "--font-inter", display: "swap" });
const staatliches = Staatliches({ subsets: ["latin"], weight: "400", variable: "--font-staatliches", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Grocer - Webflow Ecommerce HTML Website Template",
  robots: ALLOW_INDEXING ? { index: true, follow: true } : { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${staatliches.variable} w-mod-js`}>
      <body>
        {children}
        <SiteRuntime />
      </body>
    </html>
  );
}

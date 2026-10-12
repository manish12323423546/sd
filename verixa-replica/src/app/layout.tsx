import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Effects } from "@/components/Effects";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SITE } from "@/lib/site";
import "./globals.css";

const interDisplay = localFont({
  src: [
    { path: "../fonts/inter-display-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/inter-display-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/inter-display-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-inter-display",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
});

const TITLE = "Hirepulse Solutions – Recruitment & Staffing Across IT and Non-IT";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: TITLE, template: "%s – Hirepulse Solutions" },
  description: SITE.description,
  // Stays out of search results until the site moves to its own domain (set NEXT_PUBLIC_ALLOW_INDEXING=true).
  robots: process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true" ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Hirepulse Solutions",
    title: TITLE,
    description: SITE.description,
    images: [{ url: "/brand/og-image.jpg", width: 1200, height: 630, alt: "Hirepulse Solutions – Apki Job Hmari Zimmedari" }],
  },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#142c30",
};

// Hide below-the-fold reveal targets before first paint; Effects reveals them on scroll.
// Falls back to fully visible content if scripts never hydrate.
const FX_BOOT = `(function(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;var d=document.documentElement;d.classList.add('fx');setTimeout(function(){if(!d.classList.contains('fx-ready'))d.classList.remove('fx')},4000)}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={interDisplay.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: FX_BOOT }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <Effects />
      </body>
    </html>
  );
}

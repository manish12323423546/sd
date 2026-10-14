import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Gujarati, Staatliches } from "next/font/google";
import SiteRuntime from "@/components/site/runtime";
import { ALLOW_INDEXING, SITE_URL, BRAND } from "@/lib/site";
import "lenis/dist/lenis.css";
import "./webflow.css";
import "./custom.css";
import "./brand.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"], variable: "--font-inter", display: "swap" });
const staatliches = Staatliches({ subsets: ["latin"], weight: "400", variable: "--font-staatliches", display: "swap" });
const gujarati = Noto_Sans_Gujarati({ subsets: ["gujarati"], weight: ["400", "700"], variable: "--font-gujarati", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: BRAND.siteTitle, template: `%s` },
  description: BRAND.description,
  applicationName: BRAND.name,
  keywords: ["Hare Krishna Mall", "Hare Krishna Supermarket", "supermarket Virpur", "supermarket Lalsar", "grocery store Virpur Gujarat", "kirana", "retail store", "everything under one roof"],
  openGraph: { siteName: BRAND.logoName, type: "website", locale: "gu_IN", alternateLocale: ["en_IN"], images: [{ url: "/brand/og.jpg", width: 1200, height: 630, alt: BRAND.logoName }] },
  twitter: { card: "summary_large_image", images: ["/brand/og.jpg"] },
  icons: { icon: "/brand/icon.png", apple: "/brand/apple-icon.png" },
  robots: ALLOW_INDEXING ? { index: true, follow: true } : { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#012013" };

const LANG_BOOT = `try{var l=localStorage.getItem("hk-lang");if(l==="en"||l==="gu")document.documentElement.lang=l;}catch(e){}`;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: BRAND.name,
  alternateName: BRAND.logoName,
  url: SITE_URL,
  logo: `${SITE_URL}/brand/logo-stacked.png`,
  sameAs: [BRAND.instagram],
  areaServed: "Virpur, Lalsar and nearby villages, Gujarat, India",
  knowsLanguage: ["gu", "en"],
  department: [
    { "@type": "Store", name: "Hare Krishna Mall, Virpur (main branch)", hasMap: BRAND.maps.virpur, address: { "@type": "PostalAddress", addressLocality: "Virpur", addressRegion: "Gujarat", addressCountry: "IN" } },
    { "@type": "Store", name: "Hare Krishna Mall, Lalsar", hasMap: BRAND.maps.lalsar, address: { "@type": "PostalAddress", addressLocality: "Lalsar", addressRegion: "Gujarat", addressCountry: "IN" } },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="gu" className={`${inter.variable} ${staatliches.variable} ${gujarati.variable} w-mod-js`} suppressHydrationWarning>
      <head>
        {/* The remembered language is applied before paint so an English reader does not see Gujarati headings flash. */}
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOT }} />
      </head>
      <body>
        {children}
        <SiteRuntime />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}

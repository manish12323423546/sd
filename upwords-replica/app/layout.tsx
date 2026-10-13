import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import { brand } from "@/lib/content";

const sans = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-serif", display: "swap" });

const allowIndexing = process.env.ALLOW_INDEXING === "true";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://upwords-replica.vercel.app"),
  title: { default: `${brand.name} | Career Coaching (demo)`, template: `%s | ${brand.name}` },
  description: "Demo coaching site: a Next.js rebuild of a Framer layout with original sample copy and public-domain photos.",
  robots: allowIndexing ? { index: true, follow: true } : { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#f3f4ee", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

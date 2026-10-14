import type { Metadata } from "next";

export const BRAND = {
  name: "Hare Krishna Mall",
  logoName: "Hare Krishna Supermarket",
  siteTitle: "Hare Krishna Supermarket | Virpur & Lalsar",
  description: "Hare Krishna Mall brings the big-city supermarket experience to Virpur, Lalsar and the villages around them: groceries, snacks, personal care, home needs, kitchenware, pooja items and stationery, all under one roof.",
  instagram: "https://instagram.com/hare_krishna_mall_?cplk=OTdtbzI2NGcxNm93",
  maps: { virpur: "https://share.google/QZFsR2hXAd1Kq7KJ9", lalsar: "https://share.google/FSxPSffdaZ2DnIuF4" },
};
export const SITE_NAME = BRAND.name;
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://grocer-replica.vercel.app";
/** Indexing is on. Set NEXT_PUBLIC_ALLOW_INDEXING=false to block search engines (for example on a staging deployment). */
export const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING !== "false";

export type PageMeta = { title: string; description: string; ogImage: string; bodyClass: string };

export function buildMetadata(meta: PageMeta, route: string): Metadata {
  const image = meta.ogImage || "/brand/og.jpg";
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: route },
    openGraph: { title: meta.title, description: meta.description, type: "website", url: route, siteName: BRAND.logoName, images: [{ url: image, width: 1200, height: 630, alt: BRAND.logoName }] },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description, images: [image] },
    robots: ALLOW_INDEXING ? { index: true, follow: true } : { index: false, follow: false },
  };
}

import type { Metadata } from "next";

export const SITE_NAME = "Grocer";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://grocer-replica.vercel.app";
/** Search engines stay blocked until the site is on its own domain. Set NEXT_PUBLIC_ALLOW_INDEXING=true to allow indexing. */
export const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

export type PageMeta = { title: string; description: string; ogImage: string; bodyClass: string };

export function buildMetadata(meta: PageMeta, route: string): Metadata {
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: route },
    openGraph: { title: meta.title, description: meta.description, type: "website", url: route, images: meta.ogImage ? [{ url: meta.ogImage }] : undefined },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description, images: meta.ogImage ? [meta.ogImage] : undefined },
    robots: ALLOW_INDEXING ? { index: true, follow: true } : { index: false, follow: false },
  };
}

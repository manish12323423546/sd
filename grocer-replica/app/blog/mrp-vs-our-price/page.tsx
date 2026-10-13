import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/blog--mrp-vs-our-price";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/blog/mrp-vs-our-price");

export default Page;

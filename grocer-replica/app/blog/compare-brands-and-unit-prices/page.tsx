import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/blog--compare-brands-and-unit-prices";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/blog/compare-brands-and-unit-prices");

export default Page;

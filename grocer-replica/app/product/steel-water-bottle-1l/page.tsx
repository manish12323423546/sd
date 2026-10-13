import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--steel-water-bottle-1l";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/steel-water-bottle-1l");

export default Page;

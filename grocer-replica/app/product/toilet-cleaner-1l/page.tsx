import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--toilet-cleaner-1l";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/toilet-cleaner-1l");

export default Page;

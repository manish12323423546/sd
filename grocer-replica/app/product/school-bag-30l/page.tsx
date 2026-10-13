import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--school-bag-30l";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/school-bag-30l");

export default Page;

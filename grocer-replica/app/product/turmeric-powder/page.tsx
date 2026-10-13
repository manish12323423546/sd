import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--turmeric-powder";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/turmeric-powder");

export default Page;

import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--body-lotion";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/body-lotion");

export default Page;

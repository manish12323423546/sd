import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--lunch-box-3-tier";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/lunch-box-3-tier");

export default Page;

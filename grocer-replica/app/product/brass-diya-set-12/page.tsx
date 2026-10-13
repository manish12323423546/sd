import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--brass-diya-set-12";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/brass-diya-set-12");

export default Page;

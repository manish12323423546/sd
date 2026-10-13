import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--shampoo";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/shampoo");

export default Page;

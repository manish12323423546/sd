import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--shampoo-650ml";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/shampoo-650ml");

export default Page;

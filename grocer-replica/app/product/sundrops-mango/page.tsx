import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--sundrops-mango";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/sundrops-mango");

export default Page;

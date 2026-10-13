import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--premium-soybean-oil";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/premium-soybean-oil");

export default Page;

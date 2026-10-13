import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--onion";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/onion");

export default Page;

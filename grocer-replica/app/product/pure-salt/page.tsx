import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--pure-salt";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/pure-salt");

export default Page;

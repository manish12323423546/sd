import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--instant-coffee-powder";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/instant-coffee-powder");

export default Page;

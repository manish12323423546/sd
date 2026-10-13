import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--fresh-green-apple";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/fresh-green-apple");

export default Page;

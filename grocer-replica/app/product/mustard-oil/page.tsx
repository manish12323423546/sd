import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--mustard-oil";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/mustard-oil");

export default Page;

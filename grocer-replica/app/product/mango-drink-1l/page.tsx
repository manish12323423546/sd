import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--mango-drink-1l";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/mango-drink-1l");

export default Page;

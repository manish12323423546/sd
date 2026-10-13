import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--cola-drink";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/cola-drink");

export default Page;

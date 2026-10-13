import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--spinach";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/spinach");

export default Page;

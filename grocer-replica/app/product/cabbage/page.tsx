import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--cabbage";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/cabbage");

export default Page;

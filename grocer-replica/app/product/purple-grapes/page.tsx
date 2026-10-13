import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--purple-grapes";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/purple-grapes");

export default Page;

import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--carrot";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/carrot");

export default Page;

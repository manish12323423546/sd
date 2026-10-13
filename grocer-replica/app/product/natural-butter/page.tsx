import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--natural-butter";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/natural-butter");

export default Page;

import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--face-cream";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/face-cream");

export default Page;

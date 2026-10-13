import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--hand-wash";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/hand-wash");

export default Page;

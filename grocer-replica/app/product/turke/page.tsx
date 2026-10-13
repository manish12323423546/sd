import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--turke";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/turke");

export default Page;

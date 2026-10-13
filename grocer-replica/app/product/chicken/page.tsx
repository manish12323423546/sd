import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--chicken";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/chicken");

export default Page;

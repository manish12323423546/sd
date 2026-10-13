import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--conditioner";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/conditioner");

export default Page;

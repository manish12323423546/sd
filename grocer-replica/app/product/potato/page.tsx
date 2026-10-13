import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--potato";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/potato");

export default Page;

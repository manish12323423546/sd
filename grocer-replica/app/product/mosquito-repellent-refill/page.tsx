import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--mosquito-repellent-refill";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/mosquito-repellent-refill");

export default Page;

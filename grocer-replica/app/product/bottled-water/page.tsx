import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--bottled-water";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/bottled-water");

export default Page;

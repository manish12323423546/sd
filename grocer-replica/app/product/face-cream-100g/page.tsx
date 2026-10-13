import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--face-cream-100g";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/face-cream-100g");

export default Page;

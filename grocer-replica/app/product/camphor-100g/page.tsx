import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--camphor-100g";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/camphor-100g");

export default Page;

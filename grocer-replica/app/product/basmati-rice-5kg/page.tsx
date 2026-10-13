import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--basmati-rice-5kg";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/basmati-rice-5kg");

export default Page;

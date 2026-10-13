import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--lip-balm";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/lip-balm");

export default Page;

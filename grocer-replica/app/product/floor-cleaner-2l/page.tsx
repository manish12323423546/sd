import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--floor-cleaner-2l";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/floor-cleaner-2l");

export default Page;

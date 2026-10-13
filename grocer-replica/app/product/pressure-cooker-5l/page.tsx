import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--pressure-cooker-5l";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/pressure-cooker-5l");

export default Page;

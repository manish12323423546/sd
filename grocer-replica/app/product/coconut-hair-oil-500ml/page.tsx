import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--coconut-hair-oil-500ml";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/coconut-hair-oil-500ml");

export default Page;

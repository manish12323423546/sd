import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--tomato";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/tomato");

export default Page;

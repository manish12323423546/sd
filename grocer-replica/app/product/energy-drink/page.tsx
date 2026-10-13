import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--energy-drink";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/energy-drink");

export default Page;

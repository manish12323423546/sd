import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--lemon-soda";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/lemon-soda");

export default Page;

import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--mango-juice";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/mango-juice");

export default Page;

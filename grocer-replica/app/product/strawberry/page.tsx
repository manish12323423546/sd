import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--strawberry";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/strawberry");

export default Page;

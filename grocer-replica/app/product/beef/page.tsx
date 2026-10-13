import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--beef";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/beef");

export default Page;

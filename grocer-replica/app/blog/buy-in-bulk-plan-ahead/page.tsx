import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/blog--buy-in-bulk-plan-ahead";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/blog/buy-in-bulk-plan-ahead");

export default Page;

import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/blog--monthly-grocery-list";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/blog/monthly-grocery-list");

export default Page;

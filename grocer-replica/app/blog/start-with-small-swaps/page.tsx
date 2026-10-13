import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/blog--start-with-small-swaps";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/blog/start-with-small-swaps");

export default Page;

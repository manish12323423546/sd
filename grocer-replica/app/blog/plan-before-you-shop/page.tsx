import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/blog--plan-before-you-shop";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/blog/plan-before-you-shop");

export default Page;

import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/blog--give-new-life-to-the-old";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/blog/give-new-life-to-the-old");

export default Page;

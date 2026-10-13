import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/blog--diwali-shopping-checklist";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/blog/diwali-shopping-checklist");

export default Page;

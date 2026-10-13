import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/blog--navratri-ready-checklist";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/blog/navratri-ready-checklist");

export default Page;

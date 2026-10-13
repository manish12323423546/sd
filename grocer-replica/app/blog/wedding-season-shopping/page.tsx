import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/blog--wedding-season-shopping";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/blog/wedding-season-shopping");

export default Page;

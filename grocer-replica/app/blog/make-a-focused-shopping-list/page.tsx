import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/blog--make-a-focused-shopping-list";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/blog/make-a-focused-shopping-list");

export default Page;

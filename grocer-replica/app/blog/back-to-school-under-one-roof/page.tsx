import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/blog--back-to-school-under-one-roof";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/blog/back-to-school-under-one-roof");

export default Page;

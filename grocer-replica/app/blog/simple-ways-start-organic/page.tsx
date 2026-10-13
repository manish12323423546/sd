import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/blog--simple-ways-start-organic";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/blog/simple-ways-start-organic");

export default Page;

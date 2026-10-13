import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/blog--monsoon-home-essentials";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/blog/monsoon-home-essentials");

export default Page;

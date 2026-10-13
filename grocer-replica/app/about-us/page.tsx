import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/about-us";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/about-us");

export default Page;

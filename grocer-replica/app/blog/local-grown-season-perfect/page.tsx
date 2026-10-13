import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/blog--local-grown-season-perfect";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/blog/local-grown-season-perfect");

export default Page;

import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/privacy-policy";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/privacy-policy");

export default Page;

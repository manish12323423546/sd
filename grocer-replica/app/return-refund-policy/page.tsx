import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/return-refund-policy";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/return-refund-policy");

export default Page;

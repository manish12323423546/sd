import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/utility--change-log";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/utility/change-log");

export default Page;

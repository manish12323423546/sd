import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/utility--license";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/utility/license");

export default Page;

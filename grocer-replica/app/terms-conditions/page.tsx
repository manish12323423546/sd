import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/terms-conditions";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/terms-conditions");

export default Page;

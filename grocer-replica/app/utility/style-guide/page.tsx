import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/utility--style-guide";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/utility/style-guide");

export default Page;

import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/faq";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/faq");

export default Page;

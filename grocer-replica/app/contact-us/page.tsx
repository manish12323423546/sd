import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/contact-us";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/contact-us");

export default Page;

import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/home";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/");

export default Page;

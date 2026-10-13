import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/404";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/404");

export default Page;

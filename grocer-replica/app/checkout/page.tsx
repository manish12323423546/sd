import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/checkout";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/checkout");

export default Page;

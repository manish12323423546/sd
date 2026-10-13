import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--namkeen-mix-400g";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/namkeen-mix-400g");

export default Page;

import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--sugar-5kg";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/sugar-5kg");

export default Page;

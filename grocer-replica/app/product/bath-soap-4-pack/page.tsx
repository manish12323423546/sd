import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--bath-soap-4-pack";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/bath-soap-4-pack");

export default Page;

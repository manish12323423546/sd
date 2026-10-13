import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--notebooks-6-pack";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/notebooks-6-pack");

export default Page;

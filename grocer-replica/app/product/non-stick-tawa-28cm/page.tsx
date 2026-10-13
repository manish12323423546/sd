import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--non-stick-tawa-28cm";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/non-stick-tawa-28cm");

export default Page;

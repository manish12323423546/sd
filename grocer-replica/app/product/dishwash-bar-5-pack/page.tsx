import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--dishwash-bar-5-pack";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/dishwash-bar-5-pack");

export default Page;

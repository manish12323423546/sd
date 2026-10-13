import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--ball-pens-box-20";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/ball-pens-box-20");

export default Page;

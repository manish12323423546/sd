import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--wheat-flour";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/wheat-flour");

export default Page;

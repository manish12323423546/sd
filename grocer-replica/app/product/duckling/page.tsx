import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--duckling";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/duckling");

export default Page;

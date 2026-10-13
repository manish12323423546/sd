import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--orange";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/orange");

export default Page;

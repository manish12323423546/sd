import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--bucket-20l-with-mug";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/bucket-20l-with-mug");

export default Page;

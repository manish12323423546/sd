import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--storage-containers-set-of-6";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/storage-containers-set-of-6");

export default Page;

import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--mutton";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/mutton");

export default Page;

import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--toothpaste-300g";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/toothpaste-300g");

export default Page;

import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--toor-dal-1kg";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/toor-dal-1kg");

export default Page;

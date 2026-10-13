import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--chakki-atta-10kg";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/chakki-atta-10kg");

export default Page;

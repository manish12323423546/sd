import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--agarbatti-12-pack";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/agarbatti-12-pack");

export default Page;

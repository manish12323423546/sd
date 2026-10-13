import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--glucose-biscuits-family-pack";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/glucose-biscuits-family-pack");

export default Page;

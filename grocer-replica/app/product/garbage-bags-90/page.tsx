import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--garbage-bags-90";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/garbage-bags-90");

export default Page;

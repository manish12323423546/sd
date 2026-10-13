import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--cold-drink-2l";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/cold-drink-2l");

export default Page;

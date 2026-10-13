import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--potato-chips-party-pack";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/potato-chips-party-pack");

export default Page;

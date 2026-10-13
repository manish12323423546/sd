import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--detergent-powder-4kg";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/detergent-powder-4kg");

export default Page;

import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--tea-powder-500g";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/tea-powder-500g");

export default Page;

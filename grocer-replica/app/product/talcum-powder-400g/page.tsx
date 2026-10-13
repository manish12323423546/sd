import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/product--talcum-powder-400g";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/product/talcum-powder-400g");

export default Page;

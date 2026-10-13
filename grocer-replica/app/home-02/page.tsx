import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/home-02";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/home-02");

export default Page;

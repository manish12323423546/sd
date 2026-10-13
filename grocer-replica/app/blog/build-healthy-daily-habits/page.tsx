import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/blog--build-healthy-daily-habits";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/blog/build-healthy-daily-habits");

export default Page;

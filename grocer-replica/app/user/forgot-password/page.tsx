import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/user--forgot-password";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/user/forgot-password");

export default Page;

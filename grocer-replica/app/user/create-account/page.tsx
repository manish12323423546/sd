import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/user--create-account";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/user/create-account");

export default Page;

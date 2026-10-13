import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/user--login";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/user/login");

export default Page;

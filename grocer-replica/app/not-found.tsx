import type { Metadata } from "next";
import Page404, { pageMeta } from "@/components/pages/404";

export const metadata: Metadata = { title: pageMeta.title, description: pageMeta.description, robots: { index: false, follow: false } };

export default function NotFound() {
  return <Page404 />;
}

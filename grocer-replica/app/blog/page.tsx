import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Page1, { pageMeta } from "@/components/pages/blog";
import Page2 from "@/components/pages/blog-02e64ee6_page-2";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, "/blog");

const PAGES: Record<string, React.ComponentType> = { "1": Page1, "2": Page2 };

/** Paginated list: the original site pages this list with a query parameter. */
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const Comp = PAGES[page || "1"];
  if (!Comp) notFound();
  return <Comp />;
}

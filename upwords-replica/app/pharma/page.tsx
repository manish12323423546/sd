import type { Metadata } from "next";
import { practices } from "@/lib/content";
import { PracticePage } from "@/components/PracticePage";

const p = practices.find((x) => x.slug === "pharma")!;
export const metadata: Metadata = { title: "Pharma Consulting Gujarat", description: p.promise };

export default function Page() {
  return <PracticePage p={p} />;
}

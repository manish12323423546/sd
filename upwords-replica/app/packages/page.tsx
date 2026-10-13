import type { Metadata } from "next";
import { packagesPage, valuesHeading, home } from "@/lib/content";
import { Plans, Values } from "@/components/Sections";
import { Faq } from "@/components/Faq";
import { Cta } from "@/components/Cta";

export const metadata: Metadata = { title: "Packages" };

export default function PackagesPage() {
  return (
    <>
      <div style={{ paddingTop: 0 }}><Plans heading={packagesPage.heading} /></div>
      <Values heading={valuesHeading} />
      <Faq heading={home.faqHeading} />
      <Cta />
    </>
  );
}

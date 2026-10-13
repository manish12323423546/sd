import type { Metadata } from "next";
import { packagesPage, home } from "@/lib/content";
import { PlanTabs } from "@/components/PlanTabs";
import { Steps } from "@/components/Sections";
import { Faq } from "@/components/Faq";
import { Cta } from "@/components/Cta";

export const metadata: Metadata = { title: "Engagement Packages", description: "Clarivyn Advisory packages for pharma firms, doctor clinics and startups, with clear pricing and written proof of results." };

export default function PackagesPage() {
  return (
    <>
      <PlanTabs heading={packagesPage.heading} note={home.pricingNote} />
      <Steps />
      <Faq heading={home.faqHeading} />
      <Cta />
    </>
  );
}

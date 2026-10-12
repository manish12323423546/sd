import type { Metadata } from "next";
import { CaseCard } from "@/components/Cards";
import { ContactCta } from "@/components/ContactCta";
import { PageHero } from "@/components/PageHero";
import { cases } from "@/lib/content";

export const metadata: Metadata = { title: { absolute: "Case Studies – Verixa" } };

export default function CaseStudiesPage() {
  return (
    <>
      <PageHero
        title="Verixa success stories and insights"
        text="Verixa connects you with the roles that align with your goals, making your next big career move just a click away."
      />
      <section className="section">
        <div className="container case-grid">
          {cases.map((c) => (
            <CaseCard key={c.slug} item={c} />
          ))}
        </div>
      </section>
      <ContactCta />
    </>
  );
}

import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = { title: { absolute: "Changelog – Verixa" } };

export default function ChangelogPage() {
  return (
    <>
      <PageHero title="Changelog" center />
      <section className="util">
        <div className="container">
          <div className="changelog-item" data-reveal="fade">
            <h2 className="h4">V.1</h2>
            <p className="t-s date">September 2026</p>
            <p className="t-r">Initial Framer Template Release</p>
          </div>
        </div>
      </section>
    </>
  );
}

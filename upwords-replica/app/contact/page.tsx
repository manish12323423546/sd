import type { Metadata } from "next";
import { brand, contactPage, home } from "@/lib/content";
import { Reveal } from "@/components/Reveal";
import { ContactForm } from "@/components/ContactForm";
import { Faq } from "@/components/Faq";
import { Cta } from "@/components/Cta";
import { ArrowRight, Mail, Phone } from "@/components/icons";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <Reveal><h1 className="display center">{contactPage.heading[0]}<br />{contactPage.heading[1]}</h1></Reveal>
          <Reveal delay={0.1}><ContactForm /></Reveal>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <Reveal><h2 className="display center">{contactPage.directHeading[0]}<br />{contactPage.directHeading[1]}</h2></Reveal>
          <div className="direct">
            <Reveal className="direct__card">
              <Mail />
              <h3 className="h-sm">{contactPage.emailTitle}</h3>
              <p>{contactPage.emailBody}</p>
              <a href={`mailto:${brand.email}`}>{brand.email} <ArrowRight size={18} /></a>
            </Reveal>
            <Reveal className="direct__card" delay={0.1}>
              <Phone />
              <h3 className="h-sm">{contactPage.phoneTitle}</h3>
              <p>{contactPage.phoneBody}</p>
              <a href={brand.phoneHref}>{brand.phone} <ArrowRight size={18} /></a>
            </Reveal>
          </div>
          <p className="center body" style={{ marginTop: 20, fontSize: 13 }}>Sample contact details: example.com and 555 numbers are reserved for demos.</p>
        </div>
      </section>
      <Faq heading={home.faqHeading} />
      <Cta />
    </>
  );
}

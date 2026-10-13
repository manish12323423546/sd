import Image from "next/image";
import type { Metadata } from "next";
import { servicesPage, home } from "@/lib/content";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { ServiceList, Steps } from "@/components/Sections";
import { Faq } from "@/components/Faq";
import { Cta } from "@/components/Cta";

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <Reveal instant>
            <h1 className="h-xl">{servicesPage.heading[0]}<br />{servicesPage.heading[1]}</h1>
            <p>{servicesPage.body}</p>
            <Button href="/contact">Book an Intro Call</Button>
          </Reveal>
          <Reveal instant delay={0.1}>
            <div className="wide-img"><Image src="/img/services-hero.webp" alt="Two people talking at a window table" fill priority fetchPriority="high" sizes="(max-width: 809px) 92vw, 1160px" /></div>
          </Reveal>
        </div>
      </section>
      <section className="section">
        <div className="container narrow">
          <Reveal><h2 className="display center">{servicesPage.listHeading[0]}<br />{servicesPage.listHeading[1]}</h2></Reveal>
          <Reveal delay={0.1}><div style={{ marginTop: 48 }}><ServiceList light /></div></Reveal>
        </div>
      </section>
      <Steps />
      <Faq heading={home.faqHeading} />
      <Cta />
    </>
  );
}

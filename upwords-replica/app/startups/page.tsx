import Image from "next/image";
import type { Metadata } from "next";
import { brand, startupsPage as s } from "@/lib/content";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { PlanTabs } from "@/components/PlanTabs";
import { SectionHead } from "@/components/Sections";
import { Cta } from "@/components/Cta";

export const metadata: Metadata = {
  title: "Startup Consulting Gujarat | The Growth Architecture",
  description: "The Growth Architecture: Jay Modi's 36-chapter startup framework from First Rupee to ₹100 Crore, for early-stage founders across Gujarat.",
};

export default function StartupsPage() {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <div className="post-head" style={{ paddingTop: 0 }}>
            <Reveal instant>
              <p className="eyebrow">{s.eyebrow}</p>
              <h1 className="serif">{s.heading}</h1>
              <p>{s.body}</p>
              <div className="hero-actions" style={{ marginTop: 28 }}>
                <Button href="/contact">Book a Discovery Call</Button>
                <a className="btn btn--outline" href={brand.whatsapp} target="_blank" rel="noopener noreferrer"><span className="roll"><span>WhatsApp Us</span><span aria-hidden="true">WhatsApp Us</span></span></a>
              </div>
            </Reveal>
            <Reveal instant delay={0.1}>
              <div className="post-head__img"><Image src="/img/startups.webp" alt="" fill priority fetchPriority="high" sizes="(max-width: 809px) 92vw, 560px" /></div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section" id="growth-architecture">
        <div className="container">
          <SectionHead eyebrow="The Growth Architecture™" title={s.frameworkTitle} body={s.frameworkSub} />
          <div className="stages">
            {s.stages.map((x, i) => (
              <Reveal className="stage" key={x.name} delay={i * 0.08}>
                <small>{x.range}</small>
                <h3>{x.name}</h3>
                <p>{x.body}</p>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="eyebrow center" style={{ marginTop: 56 }}>7 pillars</p>
            <div className="chips">{s.pillars.map((x) => <span key={x}>{x}</span>)}</div>
          </Reveal>
        </div>
      </section>

      <section className="section--tight">
        <div className="container">
          <Reveal className="panel panel--navy center">
            <p className="eyebrow">Quick start</p>
            <h2 className="h-md">{s.quickStart.title}</h2>
            <p style={{ maxWidth: 640, margin: "14px auto 8px" }}>{s.quickStart.body}</p>
            <p className="h-md" style={{ color: "var(--gold)", marginBottom: 24 }}>{s.quickStart.price}</p>
            <Button href="/quick-services" variant="lime">Book the Startup Clarity Session</Button>
          </Reveal>
          <div className="split" id="book">
            <Reveal className="panel">
              <p className="eyebrow">Book</p>
              <h3 className="h-md">{s.book.title}</h3>
              <p className="body">{s.book.sub}</p>
            </Reveal>
            <Reveal className="panel" delay={0.1}>
              <p className="eyebrow">Masterclass</p>
              <h3 className="h-md">{s.masterclass.title}</h3>
              <p className="body">{s.masterclass.body}</p>
              <a href={brand.youtube} target="_blank" rel="noopener noreferrer" className="btn btn--green btn--sm"><span className="roll"><span>Watch on YouTube</span><span aria-hidden="true">Watch on YouTube</span></span></a>
            </Reveal>
          </div>
        </div>
      </section>

      <PlanTabs heading={["Choose your", "starting point"]} only="startups" note="Engagements run from 30 to 90 days, with written proof of results at every stage. All begin with a free 20-minute discovery call." />
      <Cta />
    </>
  );
}

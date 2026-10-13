import Image from "next/image";
import Link from "next/link";
import { brand, type Practice } from "@/lib/content";
import { Button } from "./Button";
import { Reveal } from "./Reveal";
import { PlanTabs } from "./PlanTabs";
import { Cta } from "./Cta";
import { SectionHead } from "./Sections";

export function PracticePage({ p }: { p: Practice }) {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <div className="post-head" style={{ paddingTop: 0 }}>
            <Reveal instant>
              <p className="eyebrow">{p.eyebrow}</p>
              <h1 className="serif">{p.heading}</h1>
              <p>{p.body}</p>
              <div className="hero-actions" style={{ marginTop: 28 }}>
                <Button href="/contact">Book a Discovery Call</Button>
                <a className="btn btn--outline" href={brand.whatsapp} target="_blank" rel="noopener noreferrer"><span className="roll"><span>WhatsApp Us</span><span aria-hidden="true">WhatsApp Us</span></span></a>
              </div>
            </Reveal>
            <Reveal instant delay={0.1}>
              <div className="post-head__img"><Image src={p.image} alt="" fill priority fetchPriority="high" sizes="(max-width: 809px) 92vw, 560px" /></div>
            </Reveal>
          </div>
          <Reveal><p className="promise">{p.promise}</p></Reveal>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <SectionHead eyebrow="10 problems we fix" title={p.problemsHeading} />
          <div className="problems">
            {p.problems.map((x, i) => (
              <Reveal className="problem" key={x.title} delay={(i % 5) * 0.05}>
                <b>{String(i + 1).padStart(2, "0")}</b>
                <h3>{x.title}</h3>
                <p>{x.line}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <PlanTabs heading={["Choose your", "starting point"]} only={p.groupKey} note="Every engagement ends with written proof of results. Engagements begin with a free 20-minute discovery call." />
      <section className="section--tight">
        <div className="container">
          <Reveal className="panel center" >
            <h2 className="h-md">{p.closing}</h2>
            <p className="body" style={{ margin: "12px auto 24px", maxWidth: 560 }}>Not ready for a full engagement yet? Start with a 45-minute Business ROI Audit at ₹999.</p>
            <Link href="/quick-services" className="btn btn--lime"><span className="roll"><span>Explore Quick Services</span><span aria-hidden="true">Explore Quick Services</span></span></Link>
          </Reveal>
        </div>
      </section>
      <Cta />
    </>
  );
}

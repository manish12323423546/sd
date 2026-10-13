import Image from "next/image";
import type { Metadata } from "next";
import { registryPage as r } from "@/lib/content";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { Cta } from "@/components/Cta";

export const metadata: Metadata = { title: "Startup Registry", description: "The Clarivyn Startup Registry: a curated directory of screened and Clarivyn-prepared startups across Gujarat." };

const wa = (t: string) => `https://wa.me/919925196237?text=${encodeURIComponent(t)}`;

export default function RegistryPage() {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <div className="post-head" style={{ paddingTop: 0 }}>
            <Reveal instant>
              <p className="eyebrow">{r.eyebrow}</p>
              <h1 className="serif">{r.heading}</h1>
              <p>{r.body}</p>
              <p className="body" style={{ marginTop: 12 }}><strong>Sectors:</strong> {r.sectors}</p>
              <div className="hero-actions" style={{ marginTop: 28 }}>
                <a className="btn btn--green" href={wa("Hi Clarivyn Advisory, I'd like to list my startup on the registry.")} target="_blank" rel="noopener noreferrer"><span className="roll"><span>List Your Startup</span><span aria-hidden="true">List Your Startup</span></span></a>
                <a className="btn btn--outline" href={wa("Hi Clarivyn Advisory, I'd like to join the registry as an investor member.")} target="_blank" rel="noopener noreferrer"><span className="roll"><span>Join as Investor</span><span aria-hidden="true">Join as Investor</span></span></a>
              </div>
            </Reveal>
            <Reveal instant delay={0.1}>
              <div className="post-head__img"><Image src="/img/registry.webp" alt="" fill priority fetchPriority="high" sizes="(max-width: 809px) 92vw, 560px" /></div>
            </Reveal>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <Reveal className="center"><h2 className="display">Two tiers.<br />One standard.</h2></Reveal>
          <div className="badges">
            {r.badges.map((b, i) => (
              <Reveal key={b.name} className={`badge-card${i ? " badge-card--silver" : ""}`} delay={i * 0.1}>
                <h3>{b.name}</h3>
                <p className="body">{b.body}</p>
                <p className="price">{b.price}</p>
                <ul>{b.items.map((x) => <li key={x}>{x}</li>)}</ul>
              </Reveal>
            ))}
          </div>
          <div className="center" style={{ marginTop: 40 }}><Button href="/startups">View Startup Packages</Button></div>
        </div>
      </section>
      <Cta />
    </>
  );
}

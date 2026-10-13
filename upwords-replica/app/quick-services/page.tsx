import Image from "next/image";
import type { Metadata } from "next";
import { brand, quickServices as q } from "@/lib/content";
import { Reveal } from "@/components/Reveal";
import { Cta } from "@/components/Cta";

export const metadata: Metadata = { title: "Quick Services", description: "Fixed-price, single-session diagnostics from Clarivyn Advisory, from a ₹199 Idea Clarity Call to the ₹9,999 Startup Clarity Session." };

const waFor = (name: string) => `https://wa.me/919925196237?text=${encodeURIComponent(`Hi Clarivyn Advisory, I'd like to book the ${name}.`)}`;

export default function QuickServicesPage() {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <div className="post-head" style={{ paddingTop: 0 }}>
            <Reveal instant>
              <p className="eyebrow">Quick services</p>
              <h1 className="serif">{q.heading}</h1>
              <p>{q.body}</p>
            </Reveal>
            <Reveal instant delay={0.1}>
              <div className="post-head__img"><Image src="/img/quick-services.webp" alt="" fill priority fetchPriority="high" sizes="(max-width: 809px) 92vw, 560px" /></div>
            </Reveal>
          </div>
          <div className="qs-grid">
            {q.items.map((x, i) => (
              <Reveal className="qs" key={x.name} delay={(i % 3) * 0.08}>
                <small>{x.length}</small>
                <h3>{x.name}</h3>
                <div className="price">{x.price}</div>
                <p>{x.body}</p>
                <ul>{x.gets.map((g) => <li key={g}>{g}</li>)}</ul>
                <a className="btn btn--green btn--sm btn--block" href={waFor(x.name)} target="_blank" rel="noopener noreferrer"><span className="roll"><span>Book on WhatsApp</span><span aria-hidden="true">Book on WhatsApp</span></span></a>
              </Reveal>
            ))}
          </div>
          <p className="center body" style={{ marginTop: 32 }}>{q.note} Sessions run on WhatsApp video or in person in Ahmedabad. Call {brand.phone}.</p>
        </div>
      </section>
      <Cta />
    </>
  );
}

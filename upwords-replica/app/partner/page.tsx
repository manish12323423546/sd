import Image from "next/image";
import type { Metadata } from "next";
import { brand, partnerPage as p } from "@/lib/content";
import { Reveal } from "@/components/Reveal";
import { CardGrid } from "@/components/Sections";
import { Cta } from "@/components/Cta";

export const metadata: Metadata = { title: "Partner With Us", description: "Join the Clarivyn Partner Program. Refer a pharma firm, clinic doctor or startup founder and earn 10% of what they pay." };

const wa = `https://wa.me/919925196237?text=${encodeURIComponent("Hi Jay, I'd like to register as a Clarivyn partner.")}`;

export default function PartnerPage() {
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
                <a className="btn btn--green" href={wa} target="_blank" rel="noopener noreferrer"><span className="roll"><span>Register on WhatsApp</span><span aria-hidden="true">Register on WhatsApp</span></span></a>
              </div>
              <p className="body" style={{ marginTop: 12, fontSize: 14 }}>Or call Jay directly on {brand.phone}.</p>
            </Reveal>
            <Reveal instant delay={0.1}>
              <div className="post-head__img"><Image src="/img/partner.webp" alt="" fill priority fetchPriority="high" sizes="(max-width: 809px) 92vw, 560px" /></div>
            </Reveal>
          </div>
        </div>
      </section>
      <CardGrid heading={["Simple, transparent,", "generous"]} items={p.benefits} cta={false} />
      <section className="section--tight">
        <div className="container narrow">
          <Reveal className="center"><h2 className="display">Your earnings</h2></Reveal>
          <Reveal>
            <div className="table-wrap">
              <table className="rewards">
                <thead><tr><th>Package</th><th>Price</th><th>Your reward (10%)</th></tr></thead>
                <tbody>{p.rewards.map(([a, b, c]) => <tr key={a}><td>{a}</td><td>{b}</td><td>{c}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="body" style={{ marginTop: 16, fontSize: 14 }}>{p.rewardsNote}</p>
          </Reveal>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <Reveal className="center"><h2 className="display">If you know them,<br />you qualify</h2></Reveal>
          <Reveal><div className="chips">{p.who.map((w) => <span key={w}>{w}</span>)}</div></Reveal>
          <div className="steps" style={{ marginTop: 56 }}>
            {p.process.map((s, i) => (
              <Reveal className="step" key={s.title} delay={i * 0.1}>
                <span className="pill">Step 0{i + 1}</span>
                <h3 className="h-sm">{s.title}</h3>
                <p>{s.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <Cta />
    </>
  );
}

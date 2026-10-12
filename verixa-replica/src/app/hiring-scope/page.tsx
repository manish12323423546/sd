import type { Metadata } from "next";
import { ContactCta } from "@/components/ContactCta";
import { PageHero } from "@/components/PageHero";
import { Split } from "@/components/Split";
import { HIRING_SCOPE, REACH } from "@/lib/hirepulse";

export const metadata: Metadata = {
  title: "Hiring Scope & Reach",
  description: "IT and non-IT recruitment across representative sectors, with 50+ college tie-ups and regional sourcing across India.",
};

export default function HiringScopePage() {
  const cards = [
    { key: "it", data: HIRING_SCOPE.it },
    { key: "non-it", data: HIRING_SCOPE.nonIt },
  ];
  return (
    <>
      <PageHero
        title={"One partner. A\u00a0broad talent lens."}
        text="Recruitment and staffing conversations across technology, business functions and operational roles."
      />

      <section className="section">
        <div className="container">
          <span className="eyebrow">Cross-industry hiring</span>
          <Split className="h2" text="IT and Non-IT Teams" />
          <div className="scope-cards" style={{ marginTop: 40 }}>
            {cards.map(({ key, data }) => (
              <article className={`scope-card ${key === "it" ? "scope-card--it" : ""}`} key={key} data-reveal="group">
                <span className="label">{data.label}</span>
                <h3 className="h4">{data.title}</h3>
                <ul>
                  {data.roles.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div style={{ marginTop: 72 }}>
            <span className="eyebrow">Representative sectors</span>
            <ul className="sectors" data-reveal="fade">
              {HIRING_SCOPE.sectors.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="note">{HIRING_SCOPE.note}</p>
          </div>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <span className="eyebrow">Talent sourcing &amp; coverage</span>
          <Split className="h2" text="Local Knowledge. A Wider Talent Reach." />
          <div className="reach-top" style={{ marginTop: 40 }}>
            <div className="reach-stat" data-reveal="fade">
              <p className="num">50+</p>
              <p className="t-l">Active college tie-ups across India</p>
              <small>Source-reported network</small>
            </div>
            <div data-reveal="fade">
              <span className="eyebrow">Multiple sourcing channels</span>
              <ul className="channels">
                {REACH.channels.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="note">{REACH.portals}</p>
            </div>
          </div>

          <div className="regions" data-reveal="fade">
            <span className="eyebrow">Reported regional strongholds</span>
            <dl>
              {REACH.regions.map(([region, states]) => (
                <div key={region}>
                  <dt>{region}</dt>
                  <dd>{states}</dd>
                </div>
              ))}
            </dl>
            <div className="tiers" aria-label="Location types">
              {REACH.tiers.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <p className="note">{REACH.note}</p>
          </div>
        </div>
      </section>

      <ContactCta />
    </>
  );
}

import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { ContactCta } from "@/components/ContactCta";
import { Counter } from "@/components/Counter";
import { Img } from "@/components/Img";
import { Split } from "@/components/Split";
import { DELIVERY_TEAM, KEY_STATS, LEADERS, STRENGTHS, WHO_WE_ARE } from "@/lib/hirepulse";

export const metadata: Metadata = {
  title: "About Us",
  description: WHO_WE_ARE.lead,
};

const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

export default function AboutPage() {
  return (
    <>
      <section className="hero-card about-hero">
        <div className="container">
          <div className="lead">
            <span className="eyebrow load-fade">Who we are</span>
            <Split as="h1" className="h1" text={WHO_WE_ARE.title} mode="load" />
            <p className="t-r load-fade" style={d(160)}>
              {WHO_WE_ARE.lead}
            </p>
          </div>
          <div className="mosaic">
            <div className="media r16 side load-fade" style={d(260)}>
              <Img name="up00nfeeas3jyzsnrhymibgiqu" sizes="(min-width: 1200px) 370px, 100vw" alt="Two people shaking hands across a table" priority />
            </div>
            <div className="media r16 mid load-fade" style={d(340)}>
              <Img name="hepuguiaihjhsgtfoq9jffeaxi0" sizes="(min-width: 1200px) 548px, 100vw" alt="Team members working together at a computer" priority />
            </div>
            <div className="media r16 side load-fade" style={d(420)}>
              <Img name="nzefoufze4anexlgezbmskl8cm" sizes="(min-width: 1200px) 370px, 100vw" alt="Colleagues meeting in a bright office" />
            </div>
            <div className="mosaic__mission" data-reveal="fade">
              <p className="t-r">{WHO_WE_ARE.body}</p>
              <Button href="/service">Our Services</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container solution">
          <div>
            <span className="eyebrow">Why Hirepulse</span>
            <Split className="h2" text="Built Around People. Organised for Delivery." />
            <p className="t-r" style={{ marginTop: 16 }} data-reveal="fade">
              Recruitment experience, talent access and candidate support brought together in one working relationship.
            </p>
            <div className="solution__items">
              {STRENGTHS.map(([title, text]) => (
                <div className="solution-item" key={title} data-reveal="group">
                  <p>{title}</p>
                  <p className="t-s">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="media r20 solution__banner" data-reveal="fade">
            <Img name="6vvikf06eoneupsnzhuefyhtw" sizes="(min-width: 1200px) 676px, 100vw" alt="Team discussing work in a modern office" />
          </div>
        </div>
      </section>

      <section className="bg-cream" style={{ paddingBottom: "var(--sec-bottom)" }}>
        <div className="container stats">
          {KEY_STATS.map((s) => (
            <div className="stat" key={s.label} data-reveal="group">
              <p className="stat__num">
                <Counter value={s.value} suffix={s.suffix} />
              </p>
              <div>
                <p className="stat__label">{s.label}</p>
                <p className="stat__note">{s.note}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="container">
          <div className="purpose" data-reveal="fade">
            <span className="eyebrow">Our purpose</span>
            <p className="h4">{WHO_WE_ARE.purpose}</p>
          </div>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <span className="eyebrow">Our people</span>
          <Split className="h2" text="People Behind the Process" />
          <div className="leaders" style={{ marginTop: 50 }}>
            {LEADERS.map((l) => (
              <div className="leader" key={l.name} data-reveal="group">
                <div className="photo">
                  <img src={l.photo} alt={`${l.name}, ${l.role}`} width={l.w} height={l.h} loading="lazy" decoding="async" />
                </div>
                <p className="name">{l.name}</p>
                <p className="role">{l.role}</p>
              </div>
            ))}
          </div>
          <div className="team-stats">
            {DELIVERY_TEAM.map((t) => (
              <div className="team-stat" key={t.label} data-reveal="group">
                <b>{t.value}</b>
                <span>{t.label}</span>
              </div>
            ))}
          </div>
          <div className="support-team" data-reveal="fade">
            <span className="icon" aria-hidden="true">
              ✓
            </span>
            <div>
              <h3>Academic &amp; Retention Support Team</h3>
              <p className="t-s">Candidate coordination, documentation, employee engagement and workforce retention support.</p>
            </div>
          </div>
        </div>
      </section>

      <ContactCta />
    </>
  );
}

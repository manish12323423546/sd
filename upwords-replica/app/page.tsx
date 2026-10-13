import Image from "next/image";
import { brand, home, resources, youtube } from "@/lib/content";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { ScrollWords } from "@/components/ScrollWords";
import { Stories } from "@/components/Stories";
import { Faq } from "@/components/Faq";
import { Cta } from "@/components/Cta";
import { PlanTabs } from "@/components/PlanTabs";
import { ServiceList, Steps, FeatureCard } from "@/components/Sections";
import { HeroWave, ServiceWave } from "@/components/Waves";
import { QuoteMark, Sparkle, Summit, ValueIcon, SocialIcon } from "@/components/icons";

export default function HomePage() {
  const ribbon = [...home.ribbon, ...home.ribbon];
  return (
    <>
      <section className="hero clip-x">
        <div className="container">
          <Reveal instant><span className="badge">{home.badge}</span></Reveal>
          <div className="hero__grid">
            <Reveal instant delay={0.05}>
              <h1 className="serif hero__title">
                {home.heroLine1}
                <br />
                {home.heroLine2a}
                <span className="hero__icon"><Summit /></span>
                {home.heroLine2b}
              </h1>
            </Reveal>
            <Reveal instant delay={0.15} className="hero__side">
              <p>{home.heroBody}</p>
              <div className="hero-actions">
                <Button href="/contact">Book a Consultation</Button>
                <a className="btn btn--outline" href={brand.whatsapp} target="_blank" rel="noopener noreferrer">
                  <span className="roll"><span>WhatsApp Us</span><span aria-hidden="true">WhatsApp Us</span></span>
                </a>
              </div>
            </Reveal>
          </div>
          <Reveal instant delay={0.2} className="hero__media">
            <div className="hero__img">
              <Image src="/img/jay-modi.webp" alt="Jay Modi, founder of Clarivyn Advisory, at IIM Kozhikode" fill priority fetchPriority="high" sizes="(max-width: 809px) 92vw, 1152px" style={{ objectPosition: "75% 35%" }} />
            </div>
            <HeroWave className="hero__wave" />
          </Reveal>
        </div>
      </section>

      <div className="ribbon-wrap" aria-label="What we do">
        <div className="ribbon">
          <div className="ticker">
            {ribbon.map((s, i) => (
              <span className="ticker__item" key={i} aria-hidden={i >= home.ribbon.length}>
                {s}
                <Sparkle />
              </span>
            ))}
          </div>
        </div>
      </div>

      <section className="statement">
        <div className="container">
          <Reveal><h2 className="statement__big">{home.bigWord}</h2></Reveal>
          <div className="icon-row" aria-hidden="true">
            {["pill", "people", "layers"].map((n) => <span key={n}><ValueIcon name={n} /></span>)}
          </div>
          <ScrollWords text={home.statement} className="statement__text" />
          <Button href="/contact">Book a Consultation</Button>
        </div>
      </section>

      <section className="svc">
        <ServiceWave className="svc__wave" />
        <div className="container">
          <div className="svc__top">
            <Reveal><h2 className="svc__heading">{home.areasHeading[0]} <br />{home.areasHeading[1]}</h2></Reveal>
            <Reveal delay={0.1}>
              <div className="arch">
                <div className="arch__in">
                  <Image src="/img/jay-modi.webp" alt="Jay Modi" fill sizes="(max-width: 809px) 256px, 371px" style={{ objectPosition: "81% 50%" }} />
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.2} className="svc__right">
              <p className="svc__intro">{home.areasIntro}</p>
              <ServiceList />
            </Reveal>
          </div>
          <Reveal className="quote">
            <div className="quote__rule" />
            <span style={{ color: "#c9933a" }}><QuoteMark /></span>
            <p className="quote__text">{home.quote.text}</p>
            <div className="quote__avatar"><Image src="/img/jay-modi.webp" alt="" fill sizes="56px" style={{ objectPosition: "81% 40%", transform: "scale(2.6)", transformOrigin: "81% 40%" }} /></div>
            <div>{home.quote.role}</div>
            <div className="quote__name">{home.quote.name}</div>
          </Reveal>
        </div>
      </section>

      <Steps />
      <PlanTabs heading={home.pricingHeading} note={home.pricingNote} />
      <Stories heading={home.storiesHeading} />

      <section className="section">
        <div className="container">
          <Reveal><h2 className="display center">{home.resourcesHeading[0]}<br />{home.resourcesHeading[1]}</h2></Reveal>
          <div className="feat-grid">
            {resources.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.1}><FeatureCard {...r} /></Reveal>
            ))}
          </div>
          <Reveal>
            <h3 className="h-md center" style={{ marginTop: 80 }}>{youtube.heading}</h3>
            <p className="center body" style={{ maxWidth: 640, margin: "16px auto 0" }}>{youtube.body}</p>
            <div className="yt">
              {youtube.series.map((s) => (
                <a key={s} href={brand.youtube} target="_blank" rel="noopener noreferrer"><SocialIcon name="youtube" /> {s}</a>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <Faq heading={home.faqHeading} />
      <Cta />
    </>
  );
}

import Image from "next/image";
import type { Metadata } from "next";
import { about, brand, home } from "@/lib/content";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { Counter } from "@/components/Counter";
import { CardGrid } from "@/components/Sections";
import { Stories } from "@/components/Stories";
import { Faq } from "@/components/Faq";
import { Cta } from "@/components/Cta";
import { HeroWave } from "@/components/Waves";
import { QuoteMark } from "@/components/icons";

export const metadata: Metadata = {
  title: "About Jay Modi",
  description: "Meet Jay Modi, founder of Clarivyn Advisory: B.Pharma, MBA in Marketing and IIM Kozhikode Executive Alumni.",
};

export default function AboutPage() {
  return (
    <>
      <section className="container clip-x" style={{ position: "relative" }}>
        <HeroWave className="hero__wave" />
        <div className="about-hero">
          <Reveal instant>
            <p className="eyebrow">About</p>
            <h1 className="h-xl">{about.heading[0]}</h1>
            <p className="about-role">{about.role}</p>
            <p className="body" style={{ maxWidth: 480, margin: "24px 0 32px" }}>{about.body}</p>
            <Button href="/contact">Book a Free Call</Button>
            <div className="stats">
              {about.stats.map((s) => (
                <div className="stat" key={s.label}>
                  <span className="stat__bar" aria-hidden="true" />
                  <div>
                    <b><Counter value={s.value} /><small>{s.suffix}</small></b>
                    <span className="stat__label">{s.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal instant delay={0.15}>
            <div className="about-hero__img">
              <Image src="/img/jay-modi.webp" alt="Jay Modi at IIM Kozhikode" fill priority fetchPriority="high" sizes="(max-width: 809px) 92vw, 440px" style={{ objectPosition: "81% 50%" }} />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section center">
        <div className="container">
          <Reveal><h2 className="display">{about.storyHeading[0]}<br />{about.storyHeading[1]}</h2></Reveal>
          <Reveal delay={0.1}>
            <div style={{ maxWidth: 680, margin: "32px auto 0", display: "grid", gap: 16 }} className="body">
              {about.story.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="story-img" style={{ maxWidth: 820 }}><Image src="/img/jay-modi.webp" alt="Jay Modi in front of the IIM Kozhikode emblem" fill sizes="(max-width: 809px) 92vw, 820px" /></div>
          </Reveal>
          <Reveal>
            <div style={{ maxWidth: 760, margin: "56px auto 0" }}>
              <span style={{ color: "#c9933a" }}><QuoteMark /></span>
              <p className="quote__text" style={{ color: "var(--ink)" }}>{home.quote.text}</p>
              <p className="quote__name">{brand.founder}</p>
            </div>
          </Reveal>
        </div>
      </section>

      <CardGrid heading={about.credentialsHeading} items={about.credentials} />
      <Stories heading={home.storiesHeading} />
      <Faq heading={home.faqHeading} />
      <Cta />
    </>
  );
}

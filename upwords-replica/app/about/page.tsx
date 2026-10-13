import Image from "next/image";
import type { Metadata } from "next";
import { about, brand } from "@/lib/content";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { Counter } from "@/components/Counter";
import { Values } from "@/components/Sections";
import { Faq } from "@/components/Faq";
import { Cta } from "@/components/Cta";
import { HeroWave } from "@/components/Waves";
import { LogoMark } from "@/components/Logo";
import { valuesHeading, home } from "@/lib/content";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <section className="container clip-x" style={{ position: "relative" }}>
        <HeroWave className="hero__wave" />
        <div className="about-hero">
          <Reveal>
            <h1 className="h-xl">{about.heading[0]}<br />{about.heading[1]}</h1>
            <p className="body" style={{ maxWidth: 470, margin: "24px 0 32px" }}>{about.body}</p>
            <Button href="/contact">Book an Intro Call</Button>
            <div className="stats">
              {about.stats.map((s) => (
                <div className="stat" key={s.label}>
                  <span className="stat__bar" aria-hidden="true" />
                  <div>
                    <b><Counter value={s.value} decimals={s.decimals} /><small>{s.suffix}</small></b>
                    <span className="stat__label">{s.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="about-hero__img">
              <Image src="/img/coach-writing.webp" alt={`${brand.coach} at her desk`} fill priority sizes="(max-width: 809px) 92vw, 440px" style={{ objectPosition: "72% 50%" }} />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section center">
        <div className="container">
          <Reveal><h2 className="display">{about.storyHeading[0]}<br />{about.storyHeading[1]}</h2></Reveal>
          <Reveal delay={0.1}>
            <div style={{ maxWidth: 640, margin: "32px auto 0", display: "grid", gap: 16 }} className="body">
              {about.story.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="story-img"><Image src="/img/coach-desk.webp" alt="" fill sizes="(max-width: 809px) 92vw, 620px" /></div>
          </Reveal>
        </div>
      </section>

      <Values heading={valuesHeading} />

      <section className="section">
        <div className="container">
          <Reveal><h2 className="display center">{about.logosHeading[0]}<br />{about.logosHeading[1]}</h2></Reveal>
          <div className="logos">
            {about.logos.map((l, i) => (
              <Reveal key={l} delay={i * 0.08}><div><LogoMark size={26} /> {l}</div></Reveal>
            ))}
          </div>
          <p className="center body" style={{ marginTop: 16, fontSize: 13 }}>Sample company names for the demo.</p>
        </div>
      </section>

      <Faq heading={home.faqHeading} />
      <Cta />
    </>
  );
}

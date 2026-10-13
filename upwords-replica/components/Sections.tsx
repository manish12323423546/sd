import Image from "next/image";
import Link from "next/link";
import { areas, steps, home } from "@/lib/content";
import { Button } from "./Button";
import { Reveal } from "./Reveal";
import { StepsWave, SideWave } from "./Waves";
import { ArrowUpRight, ValueIcon } from "./icons";

const areaLinks = [...areas.map((a) => ({ href: `/${a.slug}`, label: a.label })), { href: "/quick-services", label: "Quick Services" }];

export function ServiceList({ light = false, exclude }: { light?: boolean; exclude?: string }) {
  return (
    <ul className={`svc-list${light ? " svc-list--light" : ""}`}>
      {areaLinks.filter((s) => s.href !== exclude).map((s) => (
        <li key={s.href}>
          <Link href={s.href}>
            <span>{s.label}</span>
            <ArrowUpRight />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Steps() {
  return (
    <section className="section">
      <div className="container">
        <Reveal className="steps-head">
          <h2 className="display">{home.stepsHeading[0]}<br />{home.stepsHeading[1]}</h2>
          <Button href="/contact">Book a Consultation</Button>
        </Reveal>
        <div className="steps">
          <StepsWave className="steps__wave" />
          {steps.map((s, i) => (
            <Reveal className="step" key={s.title} delay={i * 0.12}>
              <span className="pill">{s.label}</span>
              <h3 className="h-sm">{s.title}</h3>
              <p>{s.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export type CardItem = { icon?: string; title: string; body: string };

/** Two-column icon cards with the template's side wave. */
export function CardGrid({ heading, items, cta = true }: { heading: string[]; items: CardItem[]; cta?: boolean }) {
  return (
    <section className="section" style={{ position: "relative", overflow: "hidden" }}>
      <SideWave className="wave-left" />
      <div className="container" style={{ position: "relative" }}>
        <Reveal className="values-head">
          <h2 className="display">{heading[0]}<br />{heading[1]}</h2>
          {cta && <Button href="/contact">Book a Consultation</Button>}
        </Reveal>
        <div className="values">
          {items.map((v, i) => (
            <Reveal className="value" key={v.title} delay={(i % 2) * 0.1}>
              <span className="value__icon"><ValueIcon name={v.icon || "check"} /></span>
              <h3 className="serif">{v.title}</h3>
              <p>{v.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeatureCard({ tag, title, body, href, cta, image }: { tag: string; title: string; body: string; href: string; cta: string; image: string }) {
  return (
    <article className="feat">
      <div className="feat__img">
        <Image src={image} alt="" fill sizes="(max-width: 809px) 90vw, 560px" />
      </div>
      <div className="feat__body">
        <span className="feat__cat">{tag}</span>
        <h3 className="h-md">{title}</h3>
        <p className="clamp-2">{body}</p>
        <Button href={href} variant="lime" size="sm">{cta}</Button>
      </div>
    </article>
  );
}

export function SectionHead({ eyebrow, title, body }: { eyebrow?: string; title: string[] | string; body?: string }) {
  const t = Array.isArray(title) ? title : [title];
  return (
    <Reveal className="center" >
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="display" style={{ maxWidth: 820, margin: "0 auto" }}>{t[0]}{t[1] && <><br />{t[1]}</>}</h2>
      {body && <p className="body" style={{ maxWidth: 640, margin: "20px auto 0" }}>{body}</p>}
    </Reveal>
  );
}

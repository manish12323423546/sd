import Image from "next/image";
import Link from "next/link";
import { plans, services, steps, values, home } from "@/lib/content";
import type { Post } from "@/lib/posts";
import { Button } from "./Button";
import { Reveal } from "./Reveal";
import { StepsWave, SideWave } from "./Waves";
import { ArrowUpRight, ValueIcon } from "./icons";

export function ServiceList({ light = false, exclude }: { light?: boolean; exclude?: string }) {
  return (
    <ul className={`svc-list${light ? " svc-list--light" : ""}`}>
      {services.filter((s) => s.slug !== exclude).map((s) => (
        <li key={s.slug}>
          <Link href={`/service/${s.slug}`}>
            <span>{s.title}</span>
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
          <Button href="/contact">Book an Intro Call</Button>
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

export function Plans({ heading }: { heading: string[] }) {
  return (
    <section className="section">
      <div className="container">
        <Reveal><h2 className="display center">{heading[0]}<br />{heading[1]}</h2></Reveal>
        <div className="plans">
          {plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.1} className={`plan${p.featured ? " plan--featured" : ""}`}>
              <h3 className="h-sm">{p.name}</h3>
              <div className="plan__price"><b>{p.price}</b><span>{p.unit}</span></div>
              <div className="plan__rule" />
              <span>What you get:</span>
              <ul>{p.items.map((it) => <li key={it}>{it}</li>)}</ul>
              <Button href="/contact" variant={p.featured ? "lime" : "green"} block>Choose Plan</Button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Values({ heading }: { heading: string[] }) {
  return (
    <section className="section" style={{ position: "relative", overflow: "hidden" }}>
      <SideWave className="wave-left" />
      <div className="container" style={{ position: "relative" }}>
        <Reveal className="values-head">
          <h2 className="display">{heading[0]}<br />{heading[1]}</h2>
          <Button href="/contact">Book an Intro Call</Button>
        </Reveal>
        <div className="values">
          {values.map((v, i) => (
            <Reveal className="value" key={v.title} delay={(i % 2) * 0.1}>
              <span className="value__icon"><ValueIcon name={v.icon} /></span>
              <h3 className="serif">{v.title}</h3>
              <p>{v.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeaturedPost({ post }: { post: Post }) {
  return (
    <article className="feat">
      <div className="feat__img">
        <Image src={post.image} alt="" fill sizes="(max-width: 809px) 90vw, 560px" />
      </div>
      <div className="feat__body">
        <span className="feat__cat">{post.category}</span>
        <h3 className="h-md">{post.title}</h3>
        <p className="clamp-2">{post.excerpt}</p>
        <Button href={`/blog/${post.slug}`} variant="lime" size="sm">Read More</Button>
      </div>
    </article>
  );
}

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="card">
      <Link href={`/blog/${post.slug}`} aria-label={post.title}>
        <div className="card__img">
          <Image src={post.image} alt="" fill sizes="(max-width: 809px) 90vw, 370px" />
        </div>
      </Link>
      <span className="card__cat">{post.category}</span>
      <h3 className="serif"><Link href={`/blog/${post.slug}`}>{post.title}</Link></h3>
      <Link href={`/blog/${post.slug}`} className="card__more">Read More <ArrowUpRight size={16} /></Link>
    </article>
  );
}

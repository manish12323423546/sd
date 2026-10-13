import Image from "next/image";
import { home, brand } from "@/lib/content";
import { posts } from "@/lib/posts";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { ScrollWords } from "@/components/ScrollWords";
import { Stories } from "@/components/Stories";
import { Faq } from "@/components/Faq";
import { Cta } from "@/components/Cta";
import { ServiceList, Steps, Plans, FeaturedPost } from "@/components/Sections";
import { HeroWave, ServiceWave } from "@/components/Waves";
import { QuoteMark, Sparkle, Summit } from "@/components/icons";

export default function HomePage() {
  const stats = [...home.stats, ...home.stats];
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
              <Button href="/contact">Book an Intro Call</Button>
            </Reveal>
          </div>
          <Reveal instant delay={0.2} className="hero__media">
            <div className="hero__img">
              <Image src="/img/coach-desk.webp" alt={`${brand.coach}, the coach, writing at her desk`} fill priority fetchPriority="high" sizes="(max-width: 809px) 92vw, 1152px" style={{ objectPosition: "50% 35%" }} />
            </div>
            <HeroWave className="hero__wave" />
          </Reveal>
        </div>
      </section>

      <div className="ribbon-wrap" aria-label="Highlights">
        <div className="ribbon">
          <div className="ticker">
            {stats.map((s, i) => (
              <span className="ticker__item" key={i} aria-hidden={i >= home.stats.length}>
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
          <div className="avatars" aria-hidden="true">
            {["/img/client-1.webp", "/img/client-3.webp", "/img/client-2.webp"].map((src) => (
              <span key={src}><Image src={src} alt="" fill sizes="63px" /></span>
            ))}
          </div>
          <ScrollWords text={home.statement} className="statement__text" />
          <Button href="/contact">Book an Intro Call</Button>
        </div>
      </section>

      <section className="svc">
        <ServiceWave className="svc__wave" />
        <div className="container">
          <div className="svc__top">
            <Reveal><h2 className="svc__heading">{home.workHeading[0]} <br />{home.workHeading[1]}</h2></Reveal>
            <Reveal delay={0.1}>
              <div className="arch">
                <div className="arch__in">
                  <Image src="/img/coach-writing.webp" alt={`${brand.coach} working at her desk`} fill sizes="(max-width: 809px) 256px, 371px" style={{ objectPosition: "70% 50%" }} />
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.2} className="svc__right">
              <p className="svc__intro">{home.workIntro}</p>
              <ServiceList />
            </Reveal>
          </div>
          <Reveal className="quote">
            <div className="quote__rule" />
            <span style={{ color: "#bbfd6a" }}><QuoteMark /></span>
            <p className="quote__text">{home.quote.text}</p>
            <div className="quote__avatar"><Image src={home.quote.image} alt="" fill sizes="56px" /></div>
            <div>{home.quote.role}, {home.quote.company}</div>
            <div className="quote__name">{home.quote.name}</div>
          </Reveal>
        </div>
      </section>

      <Steps />
      <Plans heading={home.pricingHeading} />
      <Stories heading={home.storiesHeading} />

      <section className="section">
        <div className="container">
          <Reveal><h2 className="display center">{home.blogHeading[0]}<br />{home.blogHeading[1]}</h2></Reveal>
          <div className="feat-grid">
            {posts.slice(0, 2).map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.1}><FeaturedPost post={p} /></Reveal>
            ))}
          </div>
        </div>
      </section>

      <Faq heading={home.faqHeading} />
      <Cta />
    </>
  );
}

import Link from "next/link";
import { Button } from "@/components/Button";
import { PathwayCard, PurposeCard, ServiceCard, SourcingCard } from "@/components/Cards";
import { ContactCta } from "@/components/ContactCta";
import { Faq } from "@/components/Faq";
import { ProfileChecklist, UploadDoc } from "@/components/Illustrations";
import { Img } from "@/components/Img";
import { Split } from "@/components/Split";
import { COMPANY, DELIVERY_TEAM, FAQ, HIRING_SCOPE, LEADERS, MODELS, PROCESS, SERVICES } from "@/lib/hirepulse";

const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

export default function HomePage() {
  return (
    <div className="bg-white">
      <section className="home-hero">
        <div className="container home-hero__intro">
          <span className="pill load-fade" style={d(0)}>
            Recruitment &amp; Staffing · India
          </span>
          <Split as="h1" className="h1" text={COMPANY.motto} mode="load" delay={80} />
          <p className="t-r load-fade" style={d(240)}>
            {COMPANY.name} — {COMPANY.summary.charAt(0).toLowerCase() + COMPANY.summary.slice(1)}
          </p>
          <div className="btn-row load-fade" style={d(320)}>
            <Button href="/service">Our Services</Button>
            <Button href="/contact" variant="secondary">
              Hire Talent
            </Button>
          </div>
        </div>
        <div className="container">
          <div className="showcase">
            <div className="media r20 showcase__a load-fade" style={d(400)}>
              <Img name="szajswyk9grhqe5slaj60iedn9k" sizes="(min-width: 1200px) 486px, (min-width: 810px) 40vw, calc(100vw - 60px)" alt="Professional smiling while working on a laptop" priority />
            </div>
            <div className="showcase__job load-fade" style={d(480)}>
              <PathwayCard />
            </div>
            <div className="media r20 showcase__b load-fade" style={d(560)}>
              <Img name="2ya4xilpdsgydoi9lo6qcwbirq" sizes="(min-width: 1200px) 361px, (min-width: 810px) 30vw, calc(100vw - 60px)" alt="Two colleagues collaborating at a desk" />
            </div>
            <div className="showcase__career load-fade" style={d(640)}>
              <div className="copy">
                <h2 className="h3">Talent for every business direction.</h2>
                <p className="t-s">IT and non-IT recruitment — from campus and fresher hiring to experienced placements.</p>
              </div>
              <PurposeCard />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sec-head sec-head--center">
            <span className="eyebrow">Two hiring models</span>
            <Split className="h2" text="Match the Model to the Requirement" />
            <p className="t-r" data-reveal="fade">
              Choose the pathway that fits the candidate&apos;s readiness and the role&apos;s expectations.
            </p>
          </div>
          <div className="process-cards">
            <article className="process-card" data-reveal="group">
              <div className="process-card__art">
                <ProfileChecklist />
              </div>
              <div>
                <h3 className="h5">{MODELS[0].title}</h3>
                <p className="t-r">{MODELS[0].for}: source promising candidates, prepare them against an agreed role and deploy them into suitable roles.</p>
              </div>
            </article>
            <article className="process-card" data-reveal="group">
              <div className="process-card__art">
                <UploadDoc />
              </div>
              <div>
                <h3 className="h5">{MODELS[1].title}</h3>
                <p className="t-r">{MODELS[1].for}: identify experienced professionals, match their experience and skills, and place them with the client.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section bg-stone">
        <div className="container">
          <div className="sec-head sec-head--split">
            <div>
              <span className="eyebrow">What we do</span>
              <Split className="h2" text="Recruitment, With Support at Every Step" />
            </div>
            <p className="t-r" data-reveal="fade">
              A connected set of services for new teams, growing operations and experienced hiring needs.
            </p>
          </div>
          <div className="popular">
            <div className="popular__banner" data-reveal="fade">
              <div className="media r16">
                <Img name="vpizsra2kr9rgv4juix8awxxy0" sizes="(min-width: 1200px) 468px, calc(100vw - 92px)" alt="Professional holding a tablet in an office" />
              </div>
            </div>
            <div className="job-list">
              {SERVICES.map((s, i) => (
                <ServiceCard key={s.id} service={s} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split-feature">
          <div className="split-feature__copy">
            <div>
              <span className="eyebrow">Cross-industry hiring</span>
              <Split className="h2" text="One Partner. A Broad Talent Lens." />
              <p className="t-r" data-reveal="fade">
                Recruitment and staffing conversations across technology, business functions and operational roles.
              </p>
            </div>
            <div className="reqs" data-reveal="fade">
              <div>
                <h3>{HIRING_SCOPE.it.label} · {HIRING_SCOPE.it.title}</h3>
                <ul className="t-r">
                  {HIRING_SCOPE.it.roles.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>{HIRING_SCOPE.nonIt.label} · {HIRING_SCOPE.nonIt.title}</h3>
                <ul className="t-r">
                  {HIRING_SCOPE.nonIt.roles.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="feature-media feature-media--right">
            <div className="media" data-reveal="fade">
              <Img name="p4dge4uf5agixyologqssztznxg" sizes="(min-width: 1200px) 554px, calc(100vw - 24px)" alt="Professional in a meeting with colleagues" />
            </div>
            <div className="progress-card-wrap" data-reveal="fade">
              <SourcingCard />
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-ink">
        <div className="container split-feature split-feature--reverse">
          <div className="feature-media feature-media--left">
            <div className="media" data-reveal="fade">
              <Img name="u0ihudojlu4yhhocdyilhzitkx0" sizes="(min-width: 1200px) 546px, calc(100vw - 24px)" alt="Recruiter shaking hands with a candidate" />
            </div>
            <div className="review-card-wrap" data-reveal="fade">
              <div className="review-card">
                <div className="review-card__head">
                  <strong>10+ years</strong>
                  <span className="t-s">Expertise</span>
                </div>
                <p className="t-s">Hiring and training experience spanning fresher recruitment, lateral hiring and candidate preparation.</p>
                <Link href="/about-us" className="btn btn--primary btn--block btn--sm">
                  <span className="roll">
                    <span>About Hirepulse</span>
                    <span aria-hidden="true">About Hirepulse</span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
          <div className="split-feature__copy">
            <div>
              <span className="eyebrow">Why Hirepulse</span>
              <Split className="h2" text="Built Around People. Organised for Delivery." />
              <p className="t-r" data-reveal="fade">
                Recruitment experience, talent access and candidate support brought together in one working relationship.
              </p>
            </div>
            <div className="reqs on-dark" data-reveal="fade">
              <div>
                <h3>Talent access</h3>
                <ul className="t-r">
                  <li>50+ active college tie-ups</li>
                  <li>State-wise sourcing support</li>
                </ul>
              </div>
              <div>
                <h3>Candidate support</h3>
                <ul className="t-r">
                  <li>Interview preparation</li>
                  <li>Academic &amp; retention support</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sec-head sec-head--left">
            <span className="eyebrow">Our people</span>
            <Split className="h2" text="People Behind the Process" />
            <p className="t-r" data-reveal="fade">
              Desk and remote recruiters, trainers and a dedicated academic and retention support team.
            </p>
          </div>
          <div className="testimonials">
            {LEADERS.map((l) => (
              <figure className="testimonial leader-card" key={l.name} data-reveal="group">
                <div className="media">
                  <img src={l.photo} alt={`${l.name}, ${l.role}`} width={l.w} height={l.h} loading="lazy" decoding="async" />
                </div>
                <div>
                  <figcaption className="h6">{l.name}</figcaption>
                  <p className="role-line t-l">{l.role}</p>
                </div>
              </figure>
            ))}
            <div className="team-card" data-reveal="group">
              <p className="h6">Delivery team</p>
              <ul>
                {DELIVERY_TEAM.map((t) => (
                  <li key={t.label}>
                    <b>{t.value}</b>
                    <span>{t.label}</span>
                  </li>
                ))}
              </ul>
              <p className="t-s">Academic &amp; Retention Support Team for candidate coordination, documentation, employee engagement and workforce retention.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-stone">
        <div className="container">
          <div className="sec-head sec-head--center">
            <span className="eyebrow">How we work</span>
            <Split className="h2" text="A Clear Path From Brief to Joining" />
            <p className="t-r" data-reveal="fade">
              A practical recruitment workflow, coordinated around the client&apos;s needs and the candidate&apos;s journey.
            </p>
          </div>
          <ol className="steps">
            {PROCESS.map(([title, text], i) => (
              <li className="step" key={title} data-reveal="group">
                <span className="step__num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p className="t-s">{text}</p>
              </li>
            ))}
          </ol>
          <p className="steps-foot" data-reveal="fade">
            Role clarity / Candidate communication / Consistent follow-through
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sec-head sec-head--center">
            <Split className="h2" text="Frequently Asked Questions" />
            <p className="t-r" data-reveal="fade">
              Answers for employers, candidates and anyone asking about our coverage.
            </p>
          </div>
          <Faq tabs={FAQ} />
        </div>
      </section>

      <ContactCta />
    </div>
  );
}

import type { Metadata } from "next";
import { ContactCta } from "@/components/ContactCta";
import { Faq } from "@/components/Faq";
import { Img } from "@/components/Img";
import { PageHero } from "@/components/PageHero";
import { Split } from "@/components/Split";
import { DELIVERY_BRIEF, FAQ, MODELS, PROCESS, SERVICES } from "@/lib/hirepulse";

export const metadata: Metadata = {
  title: "Services",
  description: "Lateral recruitment, campus & fresher hiring, bulk & location hiring, Hire-Train-Deploy, joining & onboarding, and academic & retention support.",
};

const IMAGES: Record<string, [string, string]> = {
  "lateral-recruitment": ["tclnoamhdm54wufyd0ngqhgyjka", "Professional reviewing documents"],
  "campus-fresher-hiring": ["fd5owg1x8cfaywnaujrk5mlwvma", "Two colleagues discussing a document"],
  "bulk-location-hiring": ["lsiywfilxr7k9cnk6mzmpivqlsw", "Team working across several desks"],
  "hire-train-deploy": ["urkdl176h3xedehbfltzspal04", "Colleagues working together at a computer"],
  "joining-onboarding": ["g1kfnjr5uxxsftoryxeitpfnue", "Laptop on a desk in an office"],
  "academic-retention-support": ["6lznnfz44gsqitlbcmobs8ivsq", "Professional working on a laptop"],
};

export default function ServicePage() {
  return (
    <>
      <PageHero
        title="Recruitment, with support at every step."
        text="A connected set of services for new teams, growing operations and experienced hiring needs."
      />
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container service-list">
          {SERVICES.map((s, i) => (
            <article className="service-item" id={s.id} key={s.id}>
              <p className="num" data-reveal="fade">
                ({String(i + 1).padStart(2, "0")})
              </p>
              <div>
                <h2 className="h3" data-reveal="fade">
                  {s.title}
                </h2>
                <div className="media" data-reveal="fade">
                  <Img name={IMAGES[s.id][0]} sizes="(min-width: 1200px) 514px, 100vw" alt={IMAGES[s.id][1]} />
                </div>
              </div>
              <p className="t-r desc" data-reveal="fade">
                {s.text}
              </p>
            </article>
          ))}
          <p className="steps-foot" data-reveal="fade" style={{ marginTop: 40 }}>
            A flexible service scope, shaped around each hiring brief.
          </p>
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
          <div className="models">
            {MODELS.map((m) => (
              <article className="model" key={m.title} data-reveal="group">
                <span className="tag">{m.tag}</span>
                <h3 className="h4">{m.title}</h3>
                <p className="for">{m.for}</p>
                <ol>
                  {m.steps.map(([t, x]) => (
                    <li key={t}>
                      <span>
                        <b>{t}</b>
                        <span>{x}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
          <div className="brief" data-reveal="fade">
            <span className="eyebrow">Agree the delivery brief</span>
            <dl>
              {DELIVERY_BRIEF.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="section bg-white">
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
    </>
  );
}

import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { ContactCta } from "@/components/ContactCta";
import { Counter } from "@/components/Counter";
import { Img } from "@/components/Img";
import { Split } from "@/components/Split";
import { svg } from "@/lib/site";

export const metadata: Metadata = { title: { absolute: "About Us – Verixa" } };

const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

const SOLUTIONS = [
  ["Directly portfolio upload", "Job seekers can upload portfolios and showcase their work to stand out to recruiters and hiring managers."],
  ["Faster Candidate Discovery", "Employers can quickly identify skilled candidates through advanced search filters and profile matching."],
  ["Simplified Hiring Workflow", "From job posting to final hiring decisions, our platform helps companies manage recruitment efficiently."],
];

const STATS = [
  { value: 6.5, decimals: 1, suffix: "M+", label: "Tech professionals trust on Verixa" },
  { value: 150, decimals: 0, suffix: "k+", label: "Professionals hired yearly on Verixa" },
  { value: 50, decimals: 0, suffix: "k+", label: "Companies hire talents from Verixa" },
];

const TEAM = [
  ["Ethan Walker", "HR Manager", "y9kikd1elqmx1qfvcr0e39ory98"],
  ["Emily Carter", "Senior HR Specialist", "xijekltc5sueazitf7sqi9gas"],
  ["Olivia Bennett", "Talent Acquisition Lead", "uiepegkpemzr4rnhrkvittspdy"],
  ["Jessica Turner", "People Operations Manager", "ubeel7qgq4pdkqsjfvfpb0z48"],
  ["Amanda Lewis", "HR Business Partner", "srmfncl73735weuwmcgydwpc2a"],
  ["Daniel Brooks", "Recruitment Specialist", "nel7qtu8b7yojbgolsw1is9fbq"],
  ["Sophia Anderson", "Employee Engagement Manager", "eielhpzdwmtcq1jzb3ylysscw"],
  ["Rachel Collins", "HR Coordinator", "uqmzjehoixbb2nsolnklr6hzxi"],
];

const SOCIAL_ICONS = ["jjc6y7dtw9ptszbgnmktn1esdg4", "arvfu3zuapce2lel1a9tcoi9dc", "bliaztixdxqth79afnoggzchlly", "wzdpwxpc3xx3bd10rufd82feje"];

export default function AboutPage() {
  return (
    <>
      <section className="hero-card about-hero">
        <div className="container">
          <div className="lead">
            <Split as="h1" className="h1" text="This is our story" mode="load" />
            <p className="t-r load-fade" style={d(160)}>
              At Verixa, we believe finding the right job should be simple, transparent, and empowering. Our platform connects talented professionals with companies that are actively searching for skilled individuals.
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
              <p className="t-r">
                Our mission is to revolutionize the way people search for jobs and companies hire talent. We aim to create a user-friendly platform that bridges the gap between professionals and employers, offering the tools and resources necessary for both sides to thrive.
              </p>
              <Button href="/contact">Get Started</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container solution">
          <div>
            <Split className="h2" text="Why Finding the Right Employees Matters" />
            <p className="t-r" style={{ marginTop: 16 }} data-reveal="fade">
              Recruiting great employees is one of the most important challenges for growing businesses. At Verixa, we provide tools that simplify the hiring process and help companies discover professionals who truly fit their needs.
            </p>
            <div className="solution__items">
              {SOLUTIONS.map(([title, text]) => (
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
          {STATS.map((s) => (
            <div className="stat" key={s.label} data-reveal="group">
              <p className="stat__num">
                <Counter value={s.value} decimals={s.decimals} suffix={s.suffix} />
              </p>
              <p className="stat__label">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <Split className="h2" text="Our dedicated team" />
          <div className="team-grid" style={{ marginTop: 50 }}>
            {TEAM.map(([name, role, img]) => (
              <div className="member" key={name} data-reveal="group" tabIndex={0}>
                <div className="photo">
                  <Img name={img} sizes="(min-width: 1200px) 318px, 50vw" alt={`${name}, ${role}`} />
                  <div className="socials" aria-hidden="true">
                    {SOCIAL_ICONS.map((icon) => (
                      <span key={icon}>
                        <img src={svg(icon)} alt="" width={16} height={16} loading="lazy" />
                      </span>
                    ))}
                  </div>
                </div>
                <p className="name">{name}</p>
                <p className="role t-s">{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ContactCta />
    </>
  );
}

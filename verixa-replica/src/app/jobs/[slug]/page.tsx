import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, TextLink } from "@/components/Button";
import { ContactCta } from "@/components/ContactCta";
import { Prose } from "@/components/Prose";
import { getJob, jobs, neighbours } from "@/lib/content";
import { svg } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return jobs.map((j) => ({ slug: j.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const job = getJob((await params).slug);
  if (!job) return {};
  return { title: { absolute: job.metaTitle }, description: job.metaDescription || job.summary };
}

const ICONS: Record<string, string> = {
  industry: "xhghaxsixf1bfnqcyeugqlyqasm",
  employees: "mad8gteg8tf5las3cp5xfpslyss",
  location: "v7lu0h7lanydyygiajxpjrw2fa",
  founded: "khkmcluktn1f9gxj0eed665h68",
  email: "jlw9xkgzta4ibeixtxuj79gqgkc",
  phone: "q0v71sz8xgolwlnv0hiyxgsxise",
};
const LABELS: Record<string, string> = { industry: "Industry", employees: "Employees", location: "Location", founded: "Founded in", email: "Email", phone: "Phone" };
const SOCIAL_ICONS: Record<string, string> = {
  Twitter: "8tygirrwizs9axsngnd4arsjsm",
  YouTube: "zaav4vxpc1toukdg7cu6t7kdo",
  Reddit: "qvokedghktlq4w10co3kzzff8",
  LinkedIn: "i0cm4ymui4ypyau8tt9lqrsslo",
};

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const job = getJob((await params).slug);
  if (!job) notFound();
  const { prev, next } = neighbours(jobs, job.slug);
  const c = job.company;
  return (
    <>
      <section className="detail">
        <div className="container">
          <div className="job-head load-fade">
            <div className="job-head__row">
              <h1 className="h3">{job.title}</h1>
              <p className="h3 w-500">{job.salary}</p>
            </div>
            <div className="job-head__row">
              <div className="badge-row">
                {job.badges.map((b) => (
                  <span className="badge" key={b}>
                    {b}
                  </span>
                ))}
              </div>
              <TextLink href="/contact">Apply Now</TextLink>
            </div>
          </div>
          <div className="detail-grid detail-grid--job job-body">
            <article>
              <Prose blocks={job.body} className="prose--job" />
              <div className="apply-steps">
                <h2 className="h6" data-reveal="fade">
                  Application Process
                </h2>
                <ol className="t-r" data-reveal="fade">
                  {job.process.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
                <div className="how" data-reveal="fade">
                  <h2 className="h6">How to Apply</h2>
                  <p className="t-r">{job.howToApply}</p>
                </div>
              </div>
              <nav className="prev-next" aria-label="More jobs" style={{ marginTop: 32 }}>
                {prev ? <Link href={`/jobs/${prev.slug}`}>‹ Previous Job</Link> : <span />}
                {next ? <Link href={`/jobs/${next.slug}`}>Next Job ›</Link> : <span />}
              </nav>
            </article>
            <aside className="sticky-side" data-reveal="fade">
              <div className="side-box">
                <div className="logo-row">
                  <span className="logo-box">
                    <img src={svg(c.logo)} alt="" width={34} height={34} />
                  </span>
                  <span className="t-s">
                    <b className="w-500" style={{ display: "block" }}>
                      {c.name}
                    </b>
                    <a className="website" href={c.website} target="_blank" rel="noopener noreferrer nofollow">
                      {c.website}
                    </a>
                  </span>
                </div>
                <div className="info-list">
                  {Object.keys(LABELS).map((k) => {
                    const value = c[k as keyof typeof c];
                    return value ? (
                      <div className="info-item" key={k}>
                        <span className="icon-box">
                          <img src={svg(ICONS[k])} alt="" width={20} height={20} />
                        </span>
                        <span className="t-s">
                          <b>{LABELS[k]}</b>
                          <span>{value}</span>
                        </span>
                      </div>
                    ) : null;
                  })}
                </div>
                <div className="socials-row">
                  {job.socials.map((s) => (
                    <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.name}>
                      <img src={svg(SOCIAL_ICONS[s.name])} alt="" width={30} height={30} />
                    </a>
                  ))}
                </div>
              </div>
              <div className="side-box apply-box">
                <span className="icon-round">
                  <img src={svg("uozvhyphm5qtdo2oqbmikvdwgbi")} alt="" width={24} height={24} />
                </span>
                <p>Interested in this job?</p>
                <p className="t-s">We Believe that your career journey should be as unique as you are.</p>
                <Button href="/contact">Get Started</Button>
              </div>
            </aside>
          </div>
        </div>
      </section>
      <ContactCta />
    </>
  );
}

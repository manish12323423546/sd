import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactCta } from "@/components/ContactCta";
import { Img } from "@/components/Img";
import { Prose } from "@/components/Prose";
import { cases, getCase, neighbours } from "@/lib/content";
import { svg } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return cases.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = getCase((await params).slug);
  if (!item) return {};
  return { title: { absolute: item.metaTitle }, description: item.metaDescription || item.summary };
}

const INFO_ICONS = { industry: "xhghaxsixf1bfnqcyeugqlyqasm", location: "v7lu0h7lanydyygiajxpjrw2fa", duration: "khkmcluktn1f9gxj0eed665h68" };

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const item = getCase((await params).slug);
  if (!item) notFound();
  const { prev, next } = neighbours(cases, item.slug);
  const related = cases.filter((c) => c.slug !== item.slug).slice(0, 3);
  const info = [
    { key: "industry", label: "Industry", value: item.client.industry },
    { key: "location", label: "Location", value: item.client.location },
    { key: "duration", label: "Duration", value: item.client.duration },
  ] as const;
  return (
    <>
      <section className="detail">
        <div className="container detail-grid detail-grid--case">
          <article className="article article--case">
            <p className="t-s load-fade">{item.tag}</p>
            <h1 className="h2 load-fade" style={{ "--d": "80ms" } as React.CSSProperties}>
              {item.title}
            </h1>
            <div className="media banner load-fade" style={{ "--d": "160ms" } as React.CSSProperties}>
              <Img name={item.banner} sizes="(min-width: 1200px) 900px, 100vw" alt={item.title} priority />
            </div>
            <p className="t-l" style={{ marginTop: 24 }} data-reveal="fade">
              {item.summary}
            </p>
            <div className="stats-row">
              {item.stats.map((s) => (
                <div className="stat-card" key={s.label} data-reveal="group">
                  <p className="h4">{s.value}</p>
                  <p className="t-s">{s.label}</p>
                </div>
              ))}
            </div>
            <Prose blocks={item.body} />
            <nav className="prev-next prev-next--lg" aria-label="More case studies">
              {prev ? <Link href={`/case-studies/${prev.slug}`}>‹ Previous Case</Link> : <span />}
              {next ? <Link href={`/case-studies/${next.slug}`}>Next Case ›</Link> : <span />}
            </nav>
          </article>
          <aside className="sticky-side" data-reveal="fade">
            <div className="side-box">
              <div className="logo-row">
                <span className="logo-box">
                  <img src={svg(item.client.logo)} alt="" width={40} height={48} style={{ width: 40, height: 48 }} />
                </span>
                <span className="t-s w-500">{item.client.name}</span>
              </div>
              <div className="info-list">
                {info.map((row) =>
                  row.value ? (
                    <div className="info-item" key={row.key}>
                      <span className="icon-box">
                        <img src={svg(INFO_ICONS[row.key])} alt="" width={20} height={20} />
                      </span>
                      <span className="t-s">
                        <b>{row.label}</b>
                        <span>{row.value}</span>
                      </span>
                    </div>
                  ) : null,
                )}
              </div>
            </div>
            <div className="side-box">
              <h2 className="t-l w-600">Related Case Studies</h2>
              <div className="case-related">
                {related.map((r) => (
                  <Link href={`/case-studies/${r.slug}`} key={r.slug}>
                    <span className="logo-box logo-box--sm">
                      <img src={svg(r.client.logoSmall)} alt="" width={36} height={36} />
                    </span>
                    <span>
                      <span className="t-xs" style={{ display: "block" }}>
                        {r.tag}
                      </span>
                      <span className="title t-s" style={{ display: "block" }}>
                        {r.title}
                      </span>
                      <span className="t-s" style={{ display: "block" }}>
                        {r.client.duration}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
      <ContactCta />
    </>
  );
}

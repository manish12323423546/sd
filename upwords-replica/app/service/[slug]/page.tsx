import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { services, servicesPage } from "@/lib/content";
import { Reveal } from "@/components/Reveal";
import { ServiceList } from "@/components/Sections";
import { Cta } from "@/components/Cta";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const s = services.find((x) => x.slug === slug);
  return s ? { title: s.title, description: s.summary } : {};
}

export default async function ServicePage({ params }: Params) {
  const { slug } = await params;
  const s = services.find((x) => x.slug === slug);
  if (!s) notFound();
  return (
    <>
      <section className="page-head">
        <div className="container narrow">
          <Reveal instant>
            <Link href="/service" className="crumb">Services</Link>
            <h1 className="h-xl" style={{ fontSize: "clamp(40px, 6vw, 72px)", marginTop: 16 }}>{s.title}</h1>
          </Reveal>
          <Reveal instant delay={0.1}>
            <div className="detail-img"><Image src={s.image} alt="" fill priority fetchPriority="high" sizes="(max-width: 809px) 92vw, 760px" /></div>
          </Reveal>
          <Reveal className="prose">
            <p><strong>The idea:</strong> {s.idea}</p>
            <p><strong>Who it suits:</strong> {s.suits}</p>
            <h2>What is included</h2>
            <ul>{s.included.map((i) => <li key={i}>{i}</li>)}</ul>
            <p><strong>Afterwards:</strong> {s.after}</p>
          </Reveal>
        </div>
      </section>
      <section className="section">
        <div className="container narrow">
          <Reveal><h2 className="display center">{servicesPage.otherHeading[0]}<br />{servicesPage.otherHeading[1]}</h2></Reveal>
          <Reveal delay={0.1}><div style={{ marginTop: 48 }}><ServiceList light exclude={s.slug} /></div></Reveal>
        </div>
      </section>
      <Cta />
    </>
  );
}

import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost, posts } from "@/lib/posts";
import { blogPage } from "@/lib/content";
import { Reveal } from "@/components/Reveal";
import { PostCard } from "@/components/Sections";
import { Cta } from "@/components/Cta";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = getPost((await params).slug);
  return p ? { title: p.title.replace(/\.$/, ""), description: p.excerpt } : {};
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const more = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
  return (
    <>
      <section className="container">
        <div className="post-head">
          <Reveal instant>
            <span className="crumb">{post.category}</span>
            <h1 className="serif">{post.title}</h1>
            <p>{post.intro}</p>
          </Reveal>
          <Reveal instant delay={0.1}>
            <div className="post-head__img"><Image src={post.image} alt="" fill priority fetchPriority="high" sizes="(max-width: 809px) 92vw, 560px" /></div>
          </Reveal>
        </div>
      </section>
      <article className="container narrow prose" style={{ paddingBottom: 40 }}>
        {post.sections.map((s) => (
          <Reveal key={s.h}>
            <h2>{s.h}</h2>
            {s.p?.map((t) => <p key={t.slice(0, 24)}>{t}</p>)}
            {s.list && (s.ordered ? <ol>{s.list.map((l) => <li key={l}>{l}</li>)}</ol> : <ul>{s.list.map((l) => <li key={l}>{l}</li>)}</ul>)}
            {s.after?.map((t) => <p key={t.slice(0, 24)}>{t}</p>)}
          </Reveal>
        ))}
      </article>
      <section className="section">
        <div className="container">
          <Reveal><h2 className="display center">{blogPage.moreHeading[0]}<br />{blogPage.moreHeading[1]}</h2></Reveal>
          <div className="cards">
            {more.map((p, i) => <Reveal key={p.slug} delay={i * 0.08}><PostCard post={p} /></Reveal>)}
          </div>
        </div>
      </section>
      <Cta />
    </>
  );
}

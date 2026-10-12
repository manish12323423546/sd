import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactCta } from "@/components/ContactCta";
import { Img } from "@/components/Img";
import { Prose } from "@/components/Prose";
import { getPost, longDate, neighbours, posts } from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  return { title: { absolute: post.metaTitle }, description: post.metaDescription || post.excerpt };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const { prev, next } = neighbours(posts, post.slug);
  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 4);
  return (
    <>
      <section className="detail">
        <div className="container detail-grid">
          <article className="article">
            <div className="meta-row t-s load-fade">
              <span>{post.date}</span>
              <span className="dot" aria-hidden="true" />
              <span>{post.readTime}</span>
            </div>
            <h1 className="h2 load-fade" style={{ "--d": "80ms" } as React.CSSProperties}>
              {post.title}
            </h1>
            <div className="media banner load-fade" style={{ "--d": "160ms" } as React.CSSProperties}>
              <Img name={post.banner} sizes="(min-width: 1200px) 861px, 100vw" alt={post.title} priority />
            </div>
            <p className="t-l" style={{ marginTop: 24 }} data-reveal="fade">
              {post.excerpt}
            </p>
            <Prose blocks={post.body} className="prose--post" />
            <div className="gallery">
              {post.gallery.map((g, i) => (
                <div className="media" key={g} data-reveal="group">
                  <Img name={g} sizes="(min-width: 1200px) 418px, 100vw" alt={i === 0 ? "Professionals reviewing work together" : "Team collaborating in an office"} />
                </div>
              ))}
            </div>
            <nav className="prev-next" aria-label="More posts">
              {prev ? <Link href={`/blog/${prev.slug}`}>‹ Previous Post</Link> : <span />}
              {next ? <Link href={`/blog/${next.slug}`}>Next Post ›</Link> : <span />}
            </nav>
          </article>
          <aside className="side-box sticky-side" aria-labelledby="related-blog" data-reveal="fade">
            <h2 id="related-blog" className="h6">
              Related Blog
            </h2>
            <div className="related-list">
              {related.map((r) => (
                <Link href={`/blog/${r.slug}`} className="related" key={r.slug}>
                  <div className="media">
                    <Img name={r.thumb} sizes="147px" alt="" />
                  </div>
                  <div>
                    <p className="date">{longDate(r.date)}</p>
                    <p className="title">{r.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>
      <ContactCta />
    </>
  );
}

import type { Metadata } from "next";
import { blogPage } from "@/lib/content";
import { posts } from "@/lib/posts";
import { Reveal } from "@/components/Reveal";
import { FeaturedPost } from "@/components/Sections";
import { BlogGrid } from "@/components/BlogGrid";
import { Cta } from "@/components/Cta";

export const metadata: Metadata = { title: "Articles" };

export default function BlogPage() {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <Reveal><h1 className="display center">{blogPage.heading[0]}<br />{blogPage.heading[1]}</h1></Reveal>
          <div className="feat-grid">
            {posts.slice(2, 4).map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.1}><FeaturedPost post={p} /></Reveal>
            ))}
          </div>
        </div>
      </section>
      <BlogGrid posts={posts} filters={blogPage.filters} heading={blogPage.moreHeading} />
      <Cta />
    </>
  );
}

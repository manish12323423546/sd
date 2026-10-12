import type { Metadata } from "next";
import Link from "next/link";
import { BlogBrowser } from "@/components/BlogBrowser";
import { ContactCta } from "@/components/ContactCta";
import { Img } from "@/components/Img";
import { PageHero } from "@/components/PageHero";
import { posts } from "@/lib/content";

export const metadata: Metadata = { title: { absolute: "Blog – Verixa" } };

export default function BlogPage() {
  const [featured, ...rest] = posts;
  return (
    <>
      <PageHero
        title="Explore the Verixa Blog Posts"
        text="Verixa connects you with the roles that align with your goals, making your next big career move just a click away."
      />
      <section className="section">
        <div className="container">
          <h2 className="h3 featured-title" data-reveal="fade">
            Featured Blog
          </h2>
          <Link href={`/blog/${featured.slug}`} className="featured hover-card" data-reveal="fade">
            <div className="media zoom">
              <Img name={featured.thumb} sizes="(min-width: 1440px) 1320px, 100vw" alt={featured.title} />
            </div>
            <div className="blog-meta">
              <span>{featured.date}</span>
              <span className="dot" aria-hidden="true" />
              <span>{featured.readTime}</span>
            </div>
            <h3 className="h6">{featured.title}</h3>
          </Link>
          <BlogBrowser posts={rest} />
        </div>
      </section>
      <ContactCta />
    </>
  );
}

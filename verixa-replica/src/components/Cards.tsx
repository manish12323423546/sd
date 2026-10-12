import Link from "next/link";
import type { CaseStudy, Job, Post } from "@/lib/content";
import { FauxLink, SubmitLabel } from "./Button";
import { Img } from "./Img";

export function JobCard({ job, reveal = "group" }: { job: Job; reveal?: "group" | "fade" | false }) {
  return (
    <Link href={`/jobs/${job.slug}`} className="job-card hover-card" data-reveal={reveal || undefined}>
      <div className="job-card__head">
        <h3 className="job-card__title">{job.title}</h3>
        <span className="h6">{job.salary}</span>
      </div>
      <div className="job-card__foot">
        <div className="badge-row">
          {job.badges.map((b) => (
            <span className="badge" key={b}>
              {b}
            </span>
          ))}
        </div>
        <FauxLink>Read More</FauxLink>
      </div>
    </Link>
  );
}

export function BlogCard({
  post,
  sizes = "(min-width: 1200px) 427px, (min-width: 810px) 50vw, calc(100vw - 24px)",
  reveal = true,
}: {
  post: Post;
  sizes?: string;
  reveal?: boolean;
}) {
  return (
    <Link href={`/blog/${post.slug}`} className="blog-card hover-card" data-reveal={reveal ? "group" : undefined}>
      <div className="media zoom r16">
        <Img name={post.thumb} sizes={sizes} alt={post.title} />
      </div>
      <div className="blog-meta">
        <span>{post.date}</span>
        <span className="dot" aria-hidden="true" />
        <span>{post.readTime}</span>
      </div>
      <h3 className="h6">{post.title}</h3>
    </Link>
  );
}

export function CaseCard({ item }: { item: CaseStudy }) {
  return (
    <Link href={`/case-studies/${item.slug}`} className="case-card hover-card" data-reveal="group">
      <div className="media zoom">
        <Img name={item.card} sizes="(min-width: 1440px) 648px, (min-width: 810px) 50vw, calc(100vw - 24px)" alt={item.title} />
      </div>
      <h2>{item.title}</h2>
      <FauxLink>View Details</FauxLink>
    </Link>
  );
}

export function ProgressCard() {
  return (
    <div className="progress-card">
      <p className="h6">Job Success</p>
      <div className="progress-item">
        <p className="t-s">Remote Hiring</p>
        <div className="bar" role="img" aria-label="Remote hiring progress: 50%">
          <span style={{ width: "50%" }} />
        </div>
        <div className="progress-meta">
          <span>On track</span>
          <span>$500 / $2500</span>
        </div>
      </div>
      <div className="progress-item">
        <p className="t-s">In House Hiring</p>
        <div className="bar" role="img" aria-label="In-house hiring progress: 90%">
          <span style={{ width: "90%" }} />
        </div>
      </div>
    </div>
  );
}

export function ReviewCard() {
  return (
    <div className="review-card">
      <div className="review-card__head">
        <strong>Review</strong>
        <Link href="/about-us" className="t-s">
          Recommended
        </Link>
      </div>
      <p className="t-s">Our mission is to empower businesses every day with top talent</p>
      <Link href="/about-us" className="btn btn--primary btn--block btn--sm">
        <SubmitLabel>See recommendation</SubmitLabel>
      </Link>
    </div>
  );
}

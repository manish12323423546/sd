import { Button } from "@/components/Button";
import { BlogCard, JobCard, ProgressCard, ReviewCard } from "@/components/Cards";
import { ContactCta } from "@/components/ContactCta";
import { Faq } from "@/components/Faq";
import { ProfileChecklist, UploadDoc } from "@/components/Illustrations";
import { Img } from "@/components/Img";
import { Split } from "@/components/Split";
import { faq, jobs, posts } from "@/lib/content";

const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

const TESTIMONIALS = [
  {
    name: "Sarah Thompson",
    img: "bg1jl6yqwbh5ce2frk09ju4xtq",
    quote: "“Verixa offers great tools for tracking applicants and organising interviews. It has made our recruitment process smoother and more organised.”",
  },
  {
    name: "Steve Kal",
    img: "clsnj94mlbrteojurfvyuzmyw",
    quote: "“Verixa's job alerts kept me updated with relevant positions daily. I finally landed a role that perfectly matches my skills and aspirations.”",
  },
  {
    name: "Lee Atkins",
    img: "6dqdwza68xs597q1yszbrzrqum",
    quote: "“Verixa helped our team reach qualified candidates faster. Posting roles and shortlisting applicants now takes a fraction of the time.”",
  },
];

function Requirements({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`reqs ${dark ? "on-dark" : ""}`} data-reveal="fade">
      <div>
        <h3>Job Finding</h3>
        <ul className="t-r">
          <li>To increase impression</li>
          <li>Get skilled jobs</li>
        </ul>
      </div>
      <div>
        <h3>Matched Skills</h3>
        <ul className="t-r">
          <li>Experienced job hunter</li>
          <li>Intern opportunities</li>
        </ul>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="bg-white">
      <section className="home-hero">
        <div className="container home-hero__intro">
          <span className="pill load-fade" style={d(0)}>
            Global Job Finder Plus Portal
          </span>
          <Split as="h1" className="h1" text="Connecting top talent with leading opportunities" mode="load" delay={80} />
          <p className="t-r load-fade" style={d(240)}>
            Find jobs that match your skills and career goals. Our platform helps professionals connect with leading companies.
          </p>
          <div className="btn-row load-fade" style={d(320)}>
            <Button href="/service">View Services</Button>
            <Button href="/jobs" variant="secondary">
              Find A Job
            </Button>
          </div>
        </div>
        <div className="container">
          <div className="showcase">
            <div className="media r20 showcase__a load-fade" style={d(400)}>
              <Img name="szajswyk9grhqe5slaj60iedn9k" sizes="(min-width: 1200px) 486px, (min-width: 810px) 40vw, 100vw" alt="Smiling professional working on a laptop" priority />
            </div>
            <div className="showcase__job load-fade" style={d(480)}>
              <ProgressCard />
            </div>
            <div className="media r20 showcase__b load-fade" style={d(560)}>
              <Img name="2ya4xilpdsgydoi9lo6qcwbirq" sizes="(min-width: 1200px) 361px, (min-width: 810px) 30vw, 100vw" alt="Two colleagues collaborating at a desk" />
            </div>
            <div className="showcase__career load-fade" style={d(640)}>
              <div className="copy">
                <h2 className="h3">Boost Your Career Success</h2>
                <p className="t-s">Our mission is to empower businesses every day with top talent</p>
              </div>
              <ReviewCard />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sec-head sec-head--center">
            <Split className="h2" text="A Smooth Process With Outstanding Results" />
            <p className="t-r" data-reveal="fade">
              Highlighting the smooth and efficient process from job search to landing a role.
            </p>
          </div>
          <div className="process-cards">
            <article className="process-card" data-reveal="group">
              <div className="process-card__art">
                <ProfileChecklist />
              </div>
              <div>
                <h3 className="h5">Professional Profile Creation</h3>
                <p className="t-r">Create a professional profile that highlights your skills and experience.</p>
              </div>
            </article>
            <article className="process-card" data-reveal="group">
              <div className="process-card__art">
                <UploadDoc />
              </div>
              <div>
                <h3 className="h5">Smart Application System</h3>
                <p className="t-r">Apply to multiple jobs quickly using our streamlined application system.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section bg-stone">
        <div className="container">
          <div className="sec-head sec-head--split">
            <Split className="h2" text="The Most Popular Jobs Are Listed Below" />
            <p className="t-r" data-reveal="fade">
              Explore some of the most in-demand positions currently available on our platform.
            </p>
          </div>
          <div className="popular">
            <div className="popular__banner" data-reveal="fade">
              <div className="media r16">
                <Img name="vpizsra2kr9rgv4juix8awxxy0" sizes="(min-width: 1200px) 468px, 100vw" alt="Professional holding a tablet in an office" />
              </div>
            </div>
            <div className="job-list">
              {jobs.slice(0, 4).map((job) => (
                <JobCard key={job.slug} job={job} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split-feature">
          <div className="split-feature__copy">
            <div>
              <Split className="h2" text="Verixa Increases Your Job Success Rate" />
              <p className="t-r" data-reveal="fade">
                You will learn some job success factors and the job success strategies you need to succeed.
              </p>
            </div>
            <Requirements />
          </div>
          <div className="feature-media feature-media--right">
            <div className="media" data-reveal="fade">
              <Img name="p4dge4uf5agixyologqssztznxg" sizes="(min-width: 1200px) 554px, 100vw" alt="Professional in a meeting with colleagues" />
            </div>
            <div className="progress-card-wrap" data-reveal="fade">
              <ProgressCard />
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-ink">
        <div className="container split-feature split-feature--reverse">
          <div className="feature-media feature-media--left">
            <div className="media" data-reveal="fade">
              <Img name="u0ihudojlu4yhhocdyilhzitkx0" sizes="(min-width: 1200px) 546px, 100vw" alt="Recruiter shaking hands with a candidate" />
            </div>
            <div className="review-card-wrap" data-reveal="fade">
              <ReviewCard />
            </div>
          </div>
          <div className="split-feature__copy">
            <div>
              <Split className="h2" text="Get a Job at One of the Best Companies!" />
              <p className="t-r" data-reveal="fade">
                Find great places to work. Get access to millions of company reviews. Company name or job title. Find Companies. Do you want to search for salaries?
              </p>
            </div>
            <Requirements dark />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sec-head sec-head--left">
            <Split className="h2" text="Insight From Our Users" />
            <p className="t-r" data-reveal="fade">
              Highlighting authentic testimonials from users who found success with Verixa.
            </p>
          </div>
          <div className="testimonials">
            {TESTIMONIALS.map((t) => (
              <figure className="testimonial" key={t.name} data-reveal="group">
                <div className="media">
                  <Img name={t.img} sizes="(min-width: 1200px) 424px, (min-width: 810px) 50vw, 100vw" alt={`Portrait of ${t.name}`} />
                </div>
                <div>
                  <figcaption className="h6">{t.name}</figcaption>
                  <blockquote className="t-l">{t.quote}</blockquote>
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-stone">
        <div className="container">
          <div className="sec-head sec-head--center">
            <Split className="h2" text="Frequently Asked Questions" />
            <p className="t-r" data-reveal="fade">
              We’re ready to respond to your doubts
            </p>
          </div>
          <Faq tabs={faq} />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sec-head sec-head--center">
            <Split className="h2" text="Get Professional Insights & Tips From Our Blogs" />
            <p className="t-r" data-reveal="fade">
              Suggesting that the blog offers guidance for every stage of the job search.
            </p>
          </div>
          <div className="blog-grid">
            {posts.slice(0, 3).map((p) => (
              <BlogCard key={p.slug} post={p} />
            ))}
          </div>
        </div>
      </section>

      <ContactCta />
    </div>
  );
}

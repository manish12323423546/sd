import type { Metadata } from "next";
import { ContactCta } from "@/components/ContactCta";
import { Faq } from "@/components/Faq";
import { Img } from "@/components/Img";
import { PageHero } from "@/components/PageHero";
import { Split } from "@/components/Split";
import { faq } from "@/lib/content";

export const metadata: Metadata = { title: { absolute: "Services – Verixa" } };

const SERVICES = [
  ["Recommend Personalized Job", "tclnoamhdm54wufyd0ngqhgyjka", "Get job listings tailored to your skills, experience, and career goals. Our smart algorithms analyze your profile."],
  ["Advanced Job Search Filters", "lsiywfilxr7k9cnk6mzmpivqlsw", "Easily find the perfect role using our powerful search filters. You can search by job title, industry, location, salary range."],
  ["Remote Job Listings", "6lznnfz44gsqitlbcmobs8ivsq", "Looking for flexibility? Find legitimate remote job opportunities across various industries remote job."],
  ["Career Resources & Guidance", "fd5owg1x8cfaywnaujrk5mlwvma", "Access expert career advice, interview tips, and industry insights to help you navigate the job market with confidence."],
  ["Resume Builder", "g1kfnjr5uxxsftoryxeitpfnue", "Create a standout resume using our easy-to-use builder, and optimize your profile to attract top employers."],
];

export default function ServicePage() {
  return (
    <>
      <PageHero title="Services tailored to your needs" text="Verixa provides a complete set of tools designed to simplify the job search and hiring process." />
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container service-list">
          {SERVICES.map(([title, img, text], i) => (
            <article className="service-item" key={title}>
              <p className="num" data-reveal="fade">
                ({String(i + 1).padStart(2, "0")})
              </p>
              <div>
                <h2 className="h3" data-reveal="fade">
                  {title}
                </h2>
                <div className="media" data-reveal="fade">
                  <Img name={img} sizes="(min-width: 1200px) 514px, 100vw" alt={title} />
                </div>
              </div>
              <p className="t-r desc" data-reveal="fade">
                {text}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="section">
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
      <ContactCta />
    </>
  );
}

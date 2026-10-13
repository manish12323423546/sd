import type { Metadata } from "next";
import { brand, contactPage, home } from "@/lib/content";
import { Reveal } from "@/components/Reveal";
import { ContactForm } from "@/components/ContactForm";
import { Faq } from "@/components/Faq";
import { Cta } from "@/components/Cta";
import { ArrowRight, Mail, Phone, SocialIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Contact", description: "Talk to Clarivyn Advisory. Call or WhatsApp +91 99251 96237. Free 20-minute discovery call." };

const channels = [
  { icon: <Phone />, title: "Call or WhatsApp", lines: [{ t: brand.phone, h: brand.phoneHref }, { t: `Alternate ${brand.phoneAlt}`, h: brand.phoneAltHref }] },
  { icon: <Mail />, title: "Email", lines: [{ t: brand.email, h: `mailto:${brand.email}` }] },
  { icon: <span style={{ display: "inline-flex", transform: "scale(1.8)", transformOrigin: "left center" }}><SocialIcon name="youtube" /></span>, title: "YouTube", lines: [{ t: "youtube.com/@ClarivynAdvisory", h: brand.youtube }] },
  { icon: <span style={{ display: "inline-flex", transform: "scale(1.8)", transformOrigin: "left center" }}><SocialIcon name="linkedin" /></span>, title: "LinkedIn", lines: [{ t: "linkedin.com/in/jay-modi-601b1262", h: brand.linkedin }] },
];

export default function ContactPage() {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <Reveal instant>
            <h1 className="display center">{contactPage.heading[0]}<br />{contactPage.heading[1]}</h1>
            <p className="center body" style={{ marginTop: 16 }}>{contactPage.sub}</p>
          </Reveal>
          <Reveal instant delay={0.1}><ContactForm /></Reveal>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <Reveal><h2 className="display center">{contactPage.directHeading[0]}<br />{contactPage.directHeading[1]}</h2></Reveal>
          <div className="direct">
            {channels.map((c, i) => (
              <Reveal className="direct__card" key={c.title} delay={(i % 2) * 0.1}>
                {c.icon}
                <h3 className="h-sm">{c.title}</h3>
                {c.lines.map((l) => (
                  <p key={l.t} style={{ marginBottom: 8 }}><a href={l.h} target={l.h.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{l.t} <ArrowRight size={18} /></a></p>
                ))}
              </Reveal>
            ))}
          </div>
          <p className="center body" style={{ marginTop: 20 }}>{brand.location}</p>
        </div>
      </section>
      <Faq heading={home.faqHeading} />
      <Cta />
    </>
  );
}

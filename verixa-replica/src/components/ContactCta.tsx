import { ICON } from "@/lib/site";
import { ContactForm } from "./ContactForm";
import { Split } from "./Split";

/** "Ready to Get Started" block shown above the footer on most pages. */
export function ContactCta() {
  return (
    <section className="cta" aria-labelledby="cta-title">
      <div className="container cta-container">
        <div className="cta-card">
          <img className="cta-wave" src={ICON.wave} alt="" width={700} height={440} loading="lazy" />
          <div className="cta-left">
            <div>
              <span className="eyebrow">Let&apos;s connect</span>
              <Split id="cta-title" className="h2" text="Let's Build Your Next Team" />
              <p className="t-r" data-reveal="fade">
                Share the roles, locations and hiring priorities. Start a conversation with Hirepulse.
              </p>
              <p className="cta-mail" data-reveal="fade">
                Or email <a href="mailto:info@hirepulsesolutions.com">info@hirepulsesolutions.com</a>
              </p>
            </div>
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}

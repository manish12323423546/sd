import { ICON } from "@/lib/site";
import { ContactForm } from "./ContactForm";
import { Split } from "./Split";

// The form only claims to send when a real destination is configured (see docs/contact-form.md).
const contactEnabled = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);

/** "Ready to Get Started" block shown above the footer on most pages. */
export function ContactCta() {
  return (
    <section className="cta" aria-labelledby="cta-title">
      <div className="container cta-container">
        <div className="cta-card">
          <img className="cta-wave" src={ICON.wave} alt="" width={700} height={440} loading="lazy" />
          <div className="cta-left">
            <div>
              <Split id="cta-title" className="h2" text="Ready to Get Started" />
              <p className="t-r" data-reveal="fade">
                Verixa is your trusted platform for discovering job opportunities that match your skills, experience, and career aspirations.
              </p>
            </div>
          </div>
          <ContactForm enabled={contactEnabled} />
        </div>
      </div>
    </section>
  );
}

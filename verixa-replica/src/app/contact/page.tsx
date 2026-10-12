import type { Metadata } from "next";
import { ContactCta } from "@/components/ContactCta";
import { COMPANY } from "@/lib/hirepulse";
import { svg } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Share the roles, locations and hiring priorities. Email info@hirepulsesolutions.com or visit our Ahmedabad office.",
};

export default function ContactPage() {
  return (
    <>
      <section className="contact-page">
        <div className="container">
          <div className="contact-intro load-fade">
            <span className="eyebrow">Let&apos;s connect</span>
            <h1 className="h1">Start a conversation with Hirepulse.</h1>
          </div>
        </div>
        <div className="container address-grid">
          <div className="address-card load-fade" style={{ "--d": "0ms" } as React.CSSProperties}>
            <img src={svg("baxd6puteqa62izfeo6mtlx8eg8")} alt="" width={58} height={58} />
            <div className="bottom">
              <h2 className="h4">General enquiries</h2>
              <p className="t-r">
                <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
              </p>
              <p className="t-r">
                <a href={COMPANY.websiteUrl} target="_blank" rel="noopener noreferrer">
                  {COMPANY.website}
                </a>
              </p>
            </div>
          </div>
          <div className="address-card load-fade" style={{ "--d": "80ms" } as React.CSSProperties}>
            <img src={svg("bd2l7y9e5z8shs1wrotilpyehfy")} alt="" width={58} height={58} />
            <div className="bottom">
              <h2 className="h4">Registered office</h2>
              <address className="t-r">
                {COMPANY.office.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </address>
            </div>
          </div>
          <div className="address-card load-fade" style={{ "--d": "160ms" } as React.CSSProperties}>
            <img src={svg("gatrjrgslfotawcxd7c9qlbe9bi")} alt="" width={58} height={58} />
            <div className="bottom">
              <h2 className="h4">Branch offices</h2>
              <p className="t-r">{COMPANY.branches.join(" / ")}</p>
            </div>
          </div>
        </div>
      </section>
      <ContactCta />
    </>
  );
}

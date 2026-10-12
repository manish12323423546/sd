import type { Metadata } from "next";
import { ContactCta } from "@/components/ContactCta";
import { svg } from "@/lib/site";

export const metadata: Metadata = { title: { absolute: "Contact – Verixa" } };

const CARDS = [
  { title: "Location", value: "820 Ohio Road Scotch Plains, NJ 07076", icon: "bd2l7y9e5z8shs1wrotilpyehfy" },
  { title: "Phone", value: "+1 (360) 476 4400", icon: "gatrjrgslfotawcxd7c9qlbe9bi", href: "tel:+13604764400" },
  { title: "Email", value: "hello@verixa.com", icon: "baxd6puteqa62izfeo6mtlx8eg8", href: "mailto:hello@verixa.com" },
];

export default function ContactPage() {
  return (
    <>
      <section className="contact-page">
        <h1 className="sr-only">Contact Verixa</h1>
        <div className="container address-grid">
          {CARDS.map((c, i) => (
            <div className="address-card load-fade" style={{ "--d": `${i * 80}ms` } as React.CSSProperties} key={c.title}>
              <img src={svg(c.icon)} alt="" width={58} height={58} />
              <div className="bottom">
                <h2 className="h4">{c.title}</h2>
                <p className="t-r">{c.href ? <a href={c.href}>{c.value}</a> : c.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <ContactCta />
    </>
  );
}

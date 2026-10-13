import Link from "next/link";
import { brand, cta, footerLinks, socials } from "@/lib/content";
import { Logo } from "./Logo";
import { Button } from "./Button";
import { SocialIcon } from "./icons";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__about">
            <Logo />
            <p>
              <strong style={{ color: "var(--ink)", fontWeight: 500 }}>{brand.tagline}</strong>
              <br />
              Business consulting · {brand.location}
            </p>
            <div className="socials">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                  <SocialIcon name={s.icon} />
                </a>
              ))}
            </div>
          </div>
          <div className="footer__col">
            <p className="footer__label">PAGES</p>
            <ul className="footer__links">
              {footerLinks.map((l) => (
                <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div className="footer__cta">
            <h3 className="h-sm">Not sure where to start?</h3>
            <p>
              <a href={brand.phoneHref}>{brand.phone}</a>
              <br />
              <a href={`mailto:${brand.email}`}>{brand.email}</a>
            </p>
            <Button href="/contact">{cta.short}</Button>
          </div>
        </div>
        <div className="footer__bottom">
          © 2026 {brand.name}. Site design based on a Framer template layout by Themeflow.{" "}
          <Link href="/credits" style={{ textDecoration: "underline" }}>Photo credits</Link>
        </div>
      </div>
    </footer>
  );
}

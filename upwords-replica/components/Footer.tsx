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
            <p>{brand.name} helps capable professionals plan and win the next step in their careers.</p>
            <div className="socials">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                  <SocialIcon name={s.icon} />
                </a>
              ))}
            </div>
          </div>
          <div className="footer__col">
            <h4>PAGES</h4>
            <ul>
              {footerLinks.map((l) => (
                <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div className="footer__cta">
            <h3 className="h-sm">Ready to plan your next move?</h3>
            <p>A relaxed 30-minute intro call. No pitch, just a plan.</p>
            <Button href="/contact">{cta.short}</Button>
          </div>
        </div>
        <div className="footer__bottom">
          Demo build. Layout modelled on a Framer template by Themeflow. All names, quotes, prices and figures are sample content.
          {" "}<Link href="/credits" style={{ textDecoration: "underline" }}>Photo credits</Link>
        </div>
      </div>
    </footer>
  );
}

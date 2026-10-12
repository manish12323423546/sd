import Link from "next/link";
import { COMPANY } from "@/lib/hirepulse";
import { FOOTER, ICON } from "@/lib/site";
import { Img } from "./Img";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-top">
            <div className="footer-brand">
              <img
                src={ICON.logoFull}
                srcSet={`${ICON.logoFull} 1x, ${ICON.logoFull2x} 2x`}
                alt="Hirepulse Solutions – Apki Job Hmari Zimmedari"
                width={220}
                height={86}
                loading="lazy"
              />
              <p className="footer-tagline">{COMPANY.summary}</p>
            </div>
            <div className="footer-menus">
              {FOOTER.map((col) => (
                <div className="footer-col" key={col.title}>
                  <h2>{col.title}</h2>
                  <ul>
                    {col.links.map((l) =>
                      l.href.startsWith("http") || l.href.startsWith("mailto:") ? (
                        <li key={l.label}>
                          <a href={l.href} {...(l.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                            {l.label}
                          </a>
                        </li>
                      ) : (
                        <li key={l.label}>
                          <Link href={l.href}>{l.label}</Link>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="footer-credits">
            <p>© 2026 {COMPANY.name} All rights reserved.</p>
            <p className="footer-motto">{COMPANY.tagline}</p>
          </div>
          <p className="footer-wordmark" aria-hidden="true">
            HIREPULSE
          </p>
        </div>
        <div className="footer-photo">
          <Img name="i304g01yvdtqbwkewwngzvkk70" sizes="331px" alt="Professional working on a laptop at a desk" />
        </div>
      </div>
    </footer>
  );
}

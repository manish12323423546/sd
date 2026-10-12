import Link from "next/link";
import { FOOTER } from "@/lib/site";
import { Img } from "./Img";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-top">
            <p className="footer-tagline">Discover Job Opportunities That Match Your Skills, Experience, And Career Goals With Verixa.</p>
            <div className="footer-menus">
              {FOOTER.map((col) => (
                <div className="footer-col" key={col.title}>
                  <h2>{col.title}</h2>
                  <ul>
                    {col.links.map((l) =>
                      l.href.startsWith("http") ? (
                        <li key={l.label}>
                          <a href={l.href} target="_blank" rel="noopener noreferrer">
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
            <p>© 2026 Verixa. All rights reserved.</p>
            <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer">
              Built with Next.js
            </a>
          </div>
          <Img name="uixlh18kjaodahynjvrycpnjdu" sizes="(min-width: 1200px) 909px, 100vw" className="footer-wordmark" alt="" />
        </div>
        <div className="footer-photo">
          <Img name="i304g01yvdtqbwkewwngzvkk70" sizes="331px" alt="Man working on a laptop at a desk" />
        </div>
      </div>
    </footer>
  );
}

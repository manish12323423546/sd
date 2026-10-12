"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ICON, MAIN_NAV, PAGES_MENU } from "@/lib/site";
import { SubmitLabel } from "./Button";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Header() {
  const pathname = usePathname();
  const [pagesOpen, setPagesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobilePages, setMobilePages] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const headerRef = useRef<HTMLElement>(null);

  // Like the original, only the exact page is marked current (detail pages leave the nav plain).
  const isCurrent = (href: string) => pathname === href;

  // Close menus on navigation.
  useEffect(() => {
    setPagesOpen(false);
    setMobileOpen(false);
    setMobilePages(false);
  }, [pathname]);

  // Smart header: hide on scroll down past 150px, show on scroll up; border once scrolled.
  useEffect(() => {
    let lastY = Math.max(0, window.scrollY);
    let raf = 0;
    const tick = () => {
      raf = 0;
      const y = Math.max(0, window.scrollY);
      setScrolled(y > 8);
      const dy = y - lastY;
      const focusInside = headerRef.current?.contains(document.activeElement) && document.activeElement !== document.body;
      if (y <= 150 || focusInside) setHidden(false);
      else if (dy > 4 && !headerRef.current?.matches(":hover")) setHidden(true);
      else if (dy < -4) setHidden(false);
      if (Math.abs(dy) > 4 || y <= 150) lastY = y;
    };
    const onScroll = () => {
      raf ||= requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!pagesOpen && !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPagesOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pagesOpen, mobileOpen]);

  const openPages = () => {
    window.clearTimeout(closeTimer.current);
    setPagesOpen(true);
  };
  const closePagesSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setPagesOpen(false), 120);
  };

  return (
    <header
      ref={headerRef}
      className="site-header"
      data-hidden={hidden && !mobileOpen ? "true" : "false"}
      data-scrolled={scrolled || mobileOpen ? "true" : "false"}
    >
      <div className="container">
        <nav className="nav-wrap" aria-label="Main">
          <div className="nav-top">
            <Link href="/" className="logo" aria-label="Verixa home">
              <img src={ICON.logo} alt="Verixa" width={107} height={32} />
            </Link>
            <button
              type="button"
              className="burger"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span />
              <span />
            </button>
          </div>

          <div className="menu">
            {MAIN_NAV.map((l) => (
              <Link key={l.href} href={l.href} className="menu-link" aria-current={isCurrent(l.href) ? "page" : undefined}>
                {l.label}
              </Link>
            ))}
            <div className="pages" onMouseEnter={openPages} onMouseLeave={closePagesSoon}>
              <button
                type="button"
                className="menu-link"
                aria-expanded={pagesOpen}
                aria-controls="pages-panel"
                onClick={() => setPagesOpen((v) => !v)}
              >
                Pages
                <img className="chev" src={ICON.chevron} alt="" width={14} height={14} />
              </button>
              <AnimatePresence>
                {pagesOpen && (
                  <motion.div
                    id="pages-panel"
                    className="pages-panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    {PAGES_MENU.map((col) => (
                      <div className="pages-col" key={col.title}>
                        <h3>{col.title}</h3>
                        <ul>
                          {col.links.map((l) => (
                            <li key={l.label}>
                              <Link href={l.href}>{l.label}</Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Link href="/service" className="menu-link" aria-current={isCurrent("/service") ? "page" : undefined}>
              Service
            </Link>
          </div>

          <Link href="/contact" className="btn btn--primary nav-cta">
            <SubmitLabel>Get Started</SubmitLabel>
          </Link>

          <AnimatePresence initial={false}>
            {mobileOpen && (
              <motion.div
                id="mobile-menu"
                className="mobile-panel"
                style={{ width: "100%" }}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <div className="mobile-panel-inner">
                  <ul className="mobile-menu">
                    {MAIN_NAV.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className="menu-link" aria-current={isCurrent(l.href) ? "page" : undefined}>
                          {l.label}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <button
                        type="button"
                        className="menu-link"
                        aria-expanded={mobilePages}
                        onClick={() => setMobilePages((v) => !v)}
                      >
                        Pages
                        <img className="chev" src={ICON.chevron} alt="" width={14} height={14} />
                      </button>
                      <AnimatePresence initial={false}>
                        {mobilePages && (
                          <motion.ul
                            className="mobile-sub"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: EASE }}
                            style={{ overflow: "hidden" }}
                          >
                            {PAGES_MENU.flatMap((c) => c.links).map((l) => (
                              <li key={l.label}>
                                <Link href={l.href}>{l.label}</Link>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </li>
                    <li>
                      <Link href="/service" className="menu-link" aria-current={isCurrent("/service") ? "page" : undefined}>
                        Service
                      </Link>
                    </li>
                  </ul>
                  <Link href="/contact" className="btn btn--primary">
                    <SubmitLabel>Get Started</SubmitLabel>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </div>
    </header>
  );
}

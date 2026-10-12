"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ICON, MAIN_NAV } from "@/lib/site";
import { SubmitLabel } from "./Button";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Like the original, only the exact page is marked current (detail pages leave the nav plain).
  const isCurrent = (href: string) => pathname === href;

  // Close menus on navigation.
  useEffect(() => {
    setMobileOpen(false);
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
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

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
            <Link href="/" className="logo" aria-label="Hirepulse Solutions home">
              <img src={ICON.logo} srcSet={`${ICON.logo} 1x, ${ICON.logo2x} 2x`} alt="Hirepulse Solutions" width={168} height={44} />
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
          </div>

          <Link href="/contact" className="btn btn--primary nav-cta">
            <SubmitLabel>Hire Talent</SubmitLabel>
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
                  </ul>
                  <Link href="/contact" className="btn btn--primary">
                    <SubmitLabel>Hire Talent</SubmitLabel>
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

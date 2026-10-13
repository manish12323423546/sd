"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { nav } from "@/lib/content";
import { Logo } from "./Logo";
import { Button } from "./Button";
import { MenuIcon } from "./icons";

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

export function Header() {
  const path = usePathname() || "/";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className="header">
      <div className="header__inner">
        <Logo />
        <nav className="nav" aria-label="Main">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} aria-current={isActive(path, n.href) ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <Button href="/contact" variant="lime" size="sm" className="header__cta">Book a Consultation</Button>
        <button className="menu-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <MenuIcon open={false} />
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            className="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mobile-nav__top">
              <Logo light />
              <button className="menu-btn" style={{ display: "inline-flex", color: "#fff" }} aria-label="Close menu" onClick={() => setOpen(false)}>
                <MenuIcon open />
              </button>
            </div>
            <nav className="mobile-nav__links" aria-label="Mobile">
              {[{ label: "Home", href: "/" }, ...nav, { label: "Startup Registry", href: "/registry" }, { label: "Partner With Us", href: "/partner" }, { label: "Contact", href: "/contact" }].map((n) => (
                <Link key={n.href} href={n.href} aria-current={isActive(path, n.href) ? "page" : undefined}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

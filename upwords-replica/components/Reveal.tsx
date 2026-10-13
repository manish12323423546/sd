"use client";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = { children: ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "li" | "section" | "article"; instant?: boolean };

/**
 * Fade-and-rise reveal on scroll. Runs once per mounted node, so lists that re-render
 * (filters, load more) reveal their new items instead of leaving them hidden.
 */
export function Reveal({ children, delay = 0, y = 28, className, as = "div", instant = false }: Props) {
  if (instant) {
    // Above the fold: stay visible from the first paint (good LCP), only slide into place with CSS.
    const Tag = as;
    return <Tag className={["rise", className].filter(Boolean).join(" ")} style={{ animationDelay: `${delay}s` }}>{children}</Tag>;
  }
  const M = motion[as];
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </M>
  );
}

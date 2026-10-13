"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { faqs } from "@/lib/content";
import { PlusMinus } from "./icons";

export function Faq({ heading }: { heading: string }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="section">
      <div className="container">
        <h2 className="display center" style={{ maxWidth: 560, margin: "0 auto" }}>{heading}</h2>
        <div className="faq">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div className="faq__item" key={f.q}>
                <button className="faq__q" aria-expanded={isOpen} aria-controls={`faq-${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                  <span>{f.q}</span>
                  <span className="faq__icon"><PlusMinus open={isOpen} /></span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-${i}`}
                      className="faq__a"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p>{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { testimonials } from "@/lib/content";
import { ArrowLeft, ArrowRight, QuoteMark } from "./icons";
import { LogoMark } from "./Logo";

/** Client quotes from clarivynadvisory.com, two per slide on desktop, one on phones. */
export function Stories({ heading }: { heading: string }) {
  const [i, setI] = useState(0);
  const pages = Math.ceil(testimonials.length / 2);
  const go = (d: number) => setI((v) => (v + d + pages) % pages);
  return (
    <section className="stories" aria-roledescription="carousel" aria-label="Client testimonials">
      <div className="container">
        <div className="stories__head">
          <h2 className="display" style={{ maxWidth: 700 }}>{heading}</h2>
          <div className="stories__arrows">
            <button className="arrow-btn" aria-label="Previous testimonials" onClick={() => go(-1)}><ArrowLeft /></button>
            <button className="arrow-btn" aria-label="Next testimonials" onClick={() => go(1)}><ArrowRight /></button>
          </div>
        </div>
        <div className="stories__viewport">
          <motion.div className="stories__track" animate={{ x: `calc(${-i * 100}% - ${i * 10}px)` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            {Array.from({ length: pages }, (_, k) => (
              <div className="story-page" key={k} aria-hidden={k !== i}>
                {testimonials.slice(k * 2, k * 2 + 2).map((t) => (
                  <article className="quote-card" key={t.text.slice(0, 20)}>
                    <span className="quote-card__mark"><QuoteMark /></span>
                    <p>{t.text}</p>
                    <div className="quote-card__who"><LogoMark size={28} /><span>{t.who}</span></div>
                  </article>
                ))}
              </div>
            ))}
          </motion.div>
        </div>
        <div className="dots" aria-hidden="true">
          {Array.from({ length: pages }, (_, k) => <span key={k} className={k === i ? "on" : ""} />)}
        </div>
      </div>
    </section>
  );
}

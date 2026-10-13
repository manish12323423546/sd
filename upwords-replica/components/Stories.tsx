"use client";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, QuoteMark } from "./icons";

const stories = [
  { img: "/img/client-2.webp", text: "“I had been passed over twice. Three months of focused sessions and a clear written case later, I was leading the regional team.”", name: "Daniel Okafor", role: "Regional Manager", company: "Brightwater Retail" },
  { img: "/img/client-3.webp", text: "“Maya helped me see that my next step was sideways, not up. That move doubled my scope within a year.”", name: "Helen Marsh", role: "Programme Director", company: "Northgate Health" },
  { img: "/img/client-5.webp", text: "“The pay conversation rehearsal alone was worth it. I walked in calm and walked out with the number I asked for.”", name: "Sofia Ruiz", role: "Senior Analyst", company: "Lumen Partners" },
  { img: "/img/client-4.webp", text: "“Practical, honest and always prepared. Every session ended with something I could do the next morning.”", name: "Tom Becker", role: "Product Lead", company: "Copperleaf Studio" },
];

export function Stories({ heading }: { heading: string }) {
  const [i, setI] = useState(0);
  const go = (d: number) => setI((v) => (v + d + stories.length) % stories.length);
  return (
    <section className="stories" aria-roledescription="carousel" aria-label="Client stories">
      <div className="container">
        <div className="stories__head">
          <h2 className="display" style={{ maxWidth: 700 }}>{heading}</h2>
          <div className="stories__arrows">
            <button className="arrow-btn" aria-label="Previous story" onClick={() => go(-1)}><ArrowLeft /></button>
            <button className="arrow-btn" aria-label="Next story" onClick={() => go(1)}><ArrowRight /></button>
          </div>
        </div>
        <div className="stories__viewport">
          <motion.div className="stories__track" animate={{ x: `calc(${-i * 100}% - ${i * 10}px)` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            {stories.map((s, k) => (
              <article className="story" key={s.name} aria-hidden={k !== i} aria-label={`${k + 1} of ${stories.length}`}>
                <div className="story__img">
                  <Image src={s.img} alt={`Portrait used for the sample story of ${s.name}`} fill sizes="(max-width: 809px) 90vw, 478px" />
                </div>
                <div className="story__body">
                  <span style={{ color: "#245333", marginBottom: 24 }}><QuoteMark /></span>
                  <p>{s.text}</p>
                  <div className="story__who">
                    <div>
                      <b>{s.name}</b>
                      <span className="body">{s.role}, {s.company}</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

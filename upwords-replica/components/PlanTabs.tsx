"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { planGroups } from "@/lib/content";
import { Button } from "./Button";

/** Package cards with a tab per practice area. Cards animate on mount, so a tab switch never leaves them hidden. */
export function PlanTabs({ heading, note, only }: { heading: string[]; note?: string; only?: string }) {
  const groups = only ? planGroups.filter((g) => g.key === only) : planGroups;
  const [key, setKey] = useState(groups[0].key);
  const g = groups.find((x) => x.key === key) || groups[0];
  return (
    <section className="section" id="packages">
      <div className="container">
        <h2 className="display center">{heading[0]}<br />{heading[1]}</h2>
        {groups.length > 1 && (
          <div className="filters tabs" role="tablist" aria-label="Practice area">
            {groups.map((x) => (
              <button key={x.key} role="tab" aria-selected={x.key === key} onClick={() => setKey(x.key)}>{x.label}</button>
            ))}
          </div>
        )}
        <p className="center body" style={{ marginTop: 16 }}>{g.label} · {g.duration} · written proof of results</p>
        <AnimatePresence mode="wait">
          <motion.div key={g.key} className="plans" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
            {g.plans.map((p) => (
              <div key={p.name} className={`plan${p.featured ? " plan--featured" : ""}`}>
                <h3 className="h-sm">{p.name}{p.featured && <span className="plan__tag">Most chosen</span>}</h3>
                <div className="plan__price"><b>{p.price}</b><span>{p.unit}</span></div>
                <div className="plan__rule" />
                <span>What you get:</span>
                <ul>{p.items.map((it) => <li key={it}>{it}</li>)}</ul>
                {p.payment && <p className="plan__pay">Payment: {p.payment}</p>}
                <Button href="/contact" variant={p.featured ? "lime" : "green"} block>Get Started</Button>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
        {note && <p className="center body" style={{ marginTop: 32 }}>{note}</p>}
      </div>
    </section>
  );
}

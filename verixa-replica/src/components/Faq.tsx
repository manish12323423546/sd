"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export type FaqTab = { tab: string; items: { q: string; a: string[] }[] };

export function Faq({ tabs }: { tabs: FaqTab[] }) {
  const uid = useId();
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState<number | null>(0);

  const select = (i: number) => {
    setTab(i);
    setOpen(0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (tab + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    select(next);
    document.getElementById(`${uid}-tab-${next}`)?.focus();
  };

  return (
    <div className="faq">
      <div className="faq-tabs" data-reveal="fade">
        <div className="faq-tablist" role="tablist" aria-label="FAQ topics" onKeyDown={onKeyDown}>
          {tabs.map((t, i) => (
            <button
              key={t.tab}
              id={`${uid}-tab-${i}`}
              type="button"
              role="tab"
              className="faq-tab"
              aria-selected={tab === i}
              aria-controls={`${uid}-panel`}
              tabIndex={tab === i ? 0 : -1}
              onClick={() => select(i)}
            >
              {tab === i && <motion.span layoutId={`${uid}-pill`} className="pill-bg" transition={{ duration: 0.3, ease: EASE }} />}
              <span>{t.tab}</span>
            </button>
          ))}
        </div>
      </div>
      <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${tab}`} data-reveal="fade">
        <motion.div key={tab} className="faq-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          {tabs[tab].items.map((item, i) => {
            const expanded = open === i;
            return (
              <div className="faq-item" key={item.q}>
                <h3>
                  <button
                    type="button"
                    className="faq-q"
                    aria-expanded={expanded}
                    aria-controls={`${uid}-a-${tab}-${i}`}
                    id={`${uid}-q-${tab}-${i}`}
                    onClick={() => setOpen(expanded ? null : i)}
                  >
                    <span>{item.q}</span>
                    <span className="plus" aria-hidden="true">
                      <span />
                      <span />
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      id={`${uid}-a-${tab}-${i}`}
                      role="region"
                      aria-labelledby={`${uid}-q-${tab}-${i}`}
                      className="faq-a"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                    >
                      {item.a.map((p) => (
                        <p key={p}>{p}</p>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

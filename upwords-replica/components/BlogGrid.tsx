"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Post } from "@/lib/posts";
import { PostCard } from "./Sections";

const PAGE = 6;

/** Category filter and "Load More". Cards animate on mount so re-rendered lists never stay hidden. */
export function BlogGrid({ posts, filters, heading }: { posts: Post[]; filters: string[]; heading: string[] }) {
  const [filter, setFilter] = useState("All");
  const [limit, setLimit] = useState(PAGE);
  const list = posts.filter((p) => filter === "All" || p.category === filter);
  const shown = list.slice(0, limit);
  return (
    <section className="section">
      <div className="container">
        <div className="more-head">
          <h2 className="display">{heading[0]}<br />{heading[1]}</h2>
          <div className="filters" role="group" aria-label="Filter articles">
            {filters.map((f) => (
              <button key={f} aria-pressed={filter === f} onClick={() => { setFilter(f); setLimit(PAGE); }}>{f}</button>
            ))}
          </div>
        </div>
        <motion.div className="cards" layout>
          <AnimatePresence mode="popLayout">
            {shown.map((p, i) => (
              <motion.div
                key={p.slug}
                layout
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.5, delay: (i % PAGE) * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <PostCard post={p} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
        {list.length > limit && (
          <div className="center" style={{ marginTop: 56 }}>
            <button className="btn btn--lime btn--sm" onClick={() => setLimit((l) => l + PAGE)}>
              <span className="roll"><span>Load More</span><span aria-hidden="true">Load More</span></span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Post } from "@/lib/content";
import { BlogCard } from "./Cards";

const CATEGORIES = ["All Blog", "Career Change", "Job Search", "Future of Work", "Personal Growth"];

export function BlogBrowser({ posts }: { posts: Post[] }) {
  const [category, setCategory] = useState("All Blog");
  const visible = category === "All Blog" ? posts : posts.filter((p) => p.category === category);
  return (
    <>
      <div className="blog-filter" role="group" aria-label="Filter posts by category" data-reveal="fade">
        {CATEGORIES.map((c) => (
          <button key={c} type="button" className="chip chip--lg" aria-pressed={category === c} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {visible.length} posts shown
      </p>
      <motion.div layout className="blog-grid">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((p) => (
            <motion.div
              key={p.slug}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <BlogCard post={p} reveal={false} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

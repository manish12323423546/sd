"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Job } from "@/lib/content";
import { JobCard } from "./Cards";

const CATEGORIES = ["All Jobs", "Designer", "Developer", "Marketing", "Human Resources", "Customer Support", "Sales", "Content"];

export function JobsBrowser({ jobs }: { jobs: Job[] }) {
  const [category, setCategory] = useState("All Jobs");
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter(
      (j) =>
        (category === "All Jobs" || j.category === category) &&
        (!q || [j.title, j.company.name, j.category, ...j.badges].some((s) => s.toLowerCase().includes(q))),
    );
  }, [jobs, category, query]);

  return (
    <div className="jobs-layout">
      <aside className="filter" aria-label="Filter jobs" data-reveal="fade">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(draft);
          }}
        >
          <label className="search">
            <span className="sr-only">Search jobs</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#656565" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              name="query"
              placeholder="Enter your required job"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (!e.target.value) setQuery("");
              }}
            />
            <button type="submit">Search</button>
          </label>
        </form>
        <p className="cat-title">Categories</p>
        <div className="chips" role="group" aria-label="Job categories">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
      </aside>
      <div data-reveal="fade">
        <p className="sr-only" role="status" aria-live="polite">
          {visible.length} jobs shown
        </p>
        <motion.div layout className="job-list">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((job) => (
              <motion.div
                key={job.slug}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <JobCard job={job} reveal={false} />
              </motion.div>
            ))}
          </AnimatePresence>
          {visible.length === 0 ? <p className="empty t-r">No jobs match your search. Try another keyword or category.</p> : null}
        </motion.div>
      </div>
    </div>
  );
}

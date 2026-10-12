"use client";

import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Rebuild of the "Complete Profile" Lottie: checklist rows tick in one after another, then loop. */
export function ProfileChecklist() {
  const reduce = useReducedMotion();
  const rows = [
    { title: "Curriculam Vitae", tint: "#fde7d4", stroke: "#f08a3c" },
    { title: "Personal Data", tint: "#dfeaf7", stroke: "#3b82d6" },
    { title: "Academic Information", tint: "#f8e2f6", stroke: "#d23ccf" },
  ];
  return (
    <div className="illu" aria-hidden="true">
      <div className="illu-card">
        <div className="illu-head">
          <span className="illu-title">Complete Profile</span>
          <span className="illu-steps">
            1<span>/3</span>
            <i />
          </span>
        </div>
        <div className="illu-rows">
          {rows.map((r, i) => (
            <div className="illu-row" key={r.title}>
              <span className="illu-icon" style={{ background: r.tint }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={r.stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="13" height="18" rx="3" />
                  <path d="M8 9h5M8 13h3" />
                  <circle cx="17" cy="9" r="3.2" />
                  <path d="m15.7 9 1 1 1.6-1.8" />
                </svg>
              </span>
              <span className="illu-text">
                <b>{r.title}</b>
                <small>pdf.36</small>
              </span>
              <motion.span
                className="illu-check"
                initial={reduce ? false : { scale: 0, opacity: 0 }}
                animate={reduce ? undefined : { scale: [0, 1, 1, 1, 0], opacity: [0, 1, 1, 1, 0] }}
                transition={reduce ? undefined : { duration: 4.8, times: [0, 0.08, 0.5, 0.92, 1], delay: 0.25 + i * 0.35, repeat: Infinity, repeatDelay: 0.4, ease: EASE }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 5 5 9-10" />
                </svg>
              </motion.span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Rebuild of the "Upload Your Document" Lottie: a cursor drags a file into the drop zone, loop. */
export function UploadDoc() {
  const reduce = useReducedMotion();
  const loop = { duration: 3.6, repeat: Infinity, ease: "easeInOut" as const, times: [0, 0.35, 0.55, 0.75, 1] };
  return (
    <div className="illu" aria-hidden="true">
      <div className="illu-card">
        <div className="illu-head">
          <span className="illu-title">Upload Your Document</span>
          <span className="illu-close">×</span>
        </div>
        <div className="illu-drop">
          <motion.span
            className="illu-file"
            animate={reduce ? undefined : { x: [90, 0, 0, 0, 90], y: [-30, 0, 0, 0, -30], opacity: [0, 1, 1, 0, 0] }}
            transition={reduce ? undefined : loop}
          >
            <svg width="30" height="26" viewBox="0 0 30 26" fill="none">
              <rect x="7" y="1" width="18" height="14" rx="1.5" fill="#fff" stroke="#9db8a8" />
              <path d="M10 5h12M10 8h12M10 11h8" stroke="#8fb39d" />
              <path d="M1 8a2 2 0 0 1 2-2h7l2 3h15a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2z" fill="#f6c343" />
            </svg>
          </motion.span>
          <motion.span
            className="illu-cursor"
            animate={reduce ? undefined : { x: [100, 12, 12, 70, 100], y: [-26, 8, 8, -10, -26] }}
            transition={reduce ? undefined : loop}
          >
            <svg width="14" height="16" viewBox="0 0 14 16">
              <path d="M1 1v12l3.2-3 2.3 5 2-1-2.2-4.8H11z" fill="#111" stroke="#fff" strokeWidth="1" />
            </svg>
          </motion.span>
          <svg className="illu-up" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4" />
          </svg>
          <span className="illu-drop-text">
            Drag &amp; Drop your file or <b>browse</b>
          </span>
        </div>
        <div className="illu-foot">
          <span>Supported formats: PNG, JPG, PDF, MP4</span>
          <span className="illu-btn">Upload</span>
        </div>
      </div>
    </div>
  );
}

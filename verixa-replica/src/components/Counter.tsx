"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/** Counts up from 0 when scrolled into view (e.g. "6.5M+"), like the live site. */
export function Counter({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setN(value);
      return;
    }
    const controls = animate(0, value, { duration: 1.2, ease: [0.22, 1, 0.36, 1], onUpdate: setN });
    return () => controls.stop();
  }, [inView, reduce, value]);

  const text = `${n.toFixed(decimals)}${suffix}`;
  return (
    <span ref={ref} aria-label={`${value.toFixed(decimals)}${suffix}`}>
      <span aria-hidden="true">{text}</span>
    </span>
  );
}

"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const color = useTransform(progress, range, ["#7d7e7a", "#1d1d1d"]);
  return <motion.span style={{ color }}>{word} </motion.span>;
}

/** Statement text whose words darken one by one as the block scrolls through the viewport. */
export function ScrollWords({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <Word key={i} word={w} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />
      ))}
    </p>
  );
}

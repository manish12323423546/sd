import type { JSX } from "react";

type Props = {
  text: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  /** "load": animate on first paint with CSS (above the fold); "view": reveal on scroll. */
  mode?: "load" | "view";
  delay?: number;
  id?: string;
};

/** Heading split into words that slide up one after another (800ms, 40ms stagger). */
export function Split({ text, as = "h2", className = "", mode = "view", delay = 0, id }: Props) {
  const Tag = as as "h2";
  const words = text.split(" ");
  return (
    <Tag
      id={id}
      className={`${className} ${mode === "load" ? "load-split" : ""}`}
      data-reveal={mode === "view" ? "split" : undefined}
      style={mode === "load" ? ({ "--d": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      <span className="sr-only">{text}</span>
      {words.map((w, i) => (
        <span key={i} aria-hidden="true">
          <span className="vx-w">
            <span className="vx-wi" style={{ "--i": i } as React.CSSProperties}>
              {w}
            </span>
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
}

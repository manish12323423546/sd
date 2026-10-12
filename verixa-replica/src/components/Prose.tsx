import type { Block } from "@/lib/content";

/** Renders CMS rich text captured from the live pages (headings, paragraphs, lists, quotes). */
export function Prose({ blocks, className = "" }: { blocks: Block[]; className?: string }) {
  return (
    <div className={`prose ${className}`}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h":
            return (
              <h2 key={i} data-reveal="fade">
                {b.text}
              </h2>
            );
          case "ul":
            return (
              <ul key={i} data-reveal="fade">
                {b.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote key={i} data-reveal="fade">
                {b.text}
              </blockquote>
            );
          default:
            return (
              <p key={i} data-reveal="fade">
                {b.text}
              </p>
            );
        }
      })}
    </div>
  );
}

import { Split } from "./Split";

/** White inset hero card with a large H1 on the left and a short paragraph on the right. */
export function PageHero({ title, text, center = false }: { title: string; text?: string; center?: boolean }) {
  return (
    <section className="hero-card">
      <div className={`container ${center ? "hero-center" : "hero-split"}`}>
        <Split as="h1" className="h1" text={title} mode="load" />
        {text ? (
          <p className="t-l load-fade" style={{ "--d": "200ms" } as React.CSSProperties}>
            {text}
          </p>
        ) : null}
      </div>
    </section>
  );
}

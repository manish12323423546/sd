import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { Split } from "@/components/Split";

export const metadata: Metadata = { title: { absolute: "Page Not Found – Verixa" } };

export default function NotFound() {
  return (
    <section className="err">
      <div className="container">
        <span className="code load-fade">404</span>
        <Split as="h1" className="h1" text="Page Not Found" mode="load" delay={80} />
        <div className="load-fade" style={{ "--d": "240ms" } as React.CSSProperties}>
          <Button href="/">Go Back Home</Button>
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";
import { cta } from "@/lib/content";
import { Button } from "./Button";
import { CtaWave } from "./Waves";
import { Reveal } from "./Reveal";

const strip = ["/img/cta-1.webp", "/img/cta-2.webp", "/img/cta-3.webp", "/img/cta-4.webp", "/img/cta-5.webp"];

export function Cta() {
  return (
    <section className="cta">
      <div className="container">
        <div className="cta__card">
          <div className="strip" aria-hidden="true">
            {[...strip, ...strip].map((src, i) => (
              <div className="strip__item" key={i}>
                <Image src={src} alt="" fill sizes="(max-width: 809px) 260px, 480px" />
              </div>
            ))}
          </div>
          <CtaWave className="cta__wave" />
          <Reveal className="cta__body">
            <h2 className="h-xl">{cta.heading}</h2>
            <p>{cta.body}</p>
            <Button href="/contact" variant="lime">{cta.primary}</Button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

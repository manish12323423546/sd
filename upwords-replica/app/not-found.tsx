import { notFound as copy } from "@/lib/content";
import { Button } from "@/components/Button";
import { Cta } from "@/components/Cta";

export default function NotFound() {
  return (
    <>
      <section className="nf">
        <div className="container">
          <div className="nf__num" aria-hidden="true">
            <span>4</span>
            <span className="nf__box"><i /><i /><i /><i />0</span>
            <span>4</span>
          </div>
          <h1 className="h-xl" style={{ fontSize: "clamp(36px, 5vw, 56px)", marginTop: 24 }}>{copy.title}</h1>
          <p>{copy.body}</p>
          <Button href="/" variant="lime">{copy.button}</Button>
        </div>
      </section>
      <Cta />
    </>
  );
}

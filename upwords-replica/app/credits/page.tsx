import type { Metadata } from "next";
import credits from "@/lib/photo-credits.json";

export const metadata: Metadata = { title: "Photo credits" };

export default function CreditsPage() {
  return (
    <section className="page-head" style={{ paddingBottom: 80 }}>
      <div className="container narrow prose">
        <h1 className="display" style={{ color: "#1d1d1d" }}>Photo credits</h1>
        <p>Every photo on this demo is a public-domain (CC0) image from StockSnap, found through Openverse. Credit is not required, but is given here.</p>
        <ul>
          {credits.map((c) => (
            <li key={c.file}>
              <code>{c.file}</code>: &ldquo;{c.title}&rdquo; by {c.creator}, {" "}
              {c.source ? <a href={c.source} style={{ textDecoration: "underline" }}>source</a> : "source"} ({c.licence})
            </li>
          ))}
        </ul>
        <p>Fonts: Instrument Serif and Inter, both under the SIL Open Font Licence.</p>
      </div>
    </section>
  );
}

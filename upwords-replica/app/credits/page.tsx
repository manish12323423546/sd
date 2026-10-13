import type { Metadata } from "next";
import credits from "@/lib/photo-credits.json";

export const metadata: Metadata = { title: "Photo credits" };

export default function CreditsPage() {
  return (
    <section className="page-head" style={{ paddingBottom: 80 }}>
      <div className="container narrow prose">
        <h1 className="display" style={{ color: "var(--ink)" }}>Photo credits</h1>
        <p>The photo of Jay Modi and the Clarivyn logo are supplied by Clarivyn Advisory. All other photos are public-domain (CC0) images from StockSnap, found through Openverse; credit is not required, but is given here.</p>
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

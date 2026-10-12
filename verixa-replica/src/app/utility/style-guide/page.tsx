import type { Metadata } from "next";
import { Button, PlainButton, TextLink } from "@/components/Button";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = { title: { absolute: "Style Guide – Verixa" } };

const COLORS = [
  { group: "Primary Color", items: [["#040404", "#040404"], ["#656565", "#656565"], ["#313131", "#313131"], ["#f5f5f4", "#f5f5f4"]] },
  { group: "Border", items: [["#00000008", "rgba(0,0,0,0.08)"], ["#00000012", "rgba(0,0,0,0.12)"]] },
];

const TYPE = [
  { scale: "H1", cls: "h1", weight: "Semi Bold", size: "68px", lh: "110%", ls: "-0.02em" },
  { scale: "H2", cls: "h2", weight: "Semi Bold", size: "50px", lh: "120%", ls: "-0.02em" },
  { scale: "H3", cls: "h3", weight: "Semi Bold", size: "36px", lh: "115%", ls: "-0.02em" },
  { scale: "H4", cls: "h4", weight: "Semi Bold", size: "32px", lh: "140%", ls: "-0.02em" },
  { scale: "H5", cls: "h5", weight: "Semi Bold", size: "28px", lh: "140%", ls: "-0.02em" },
  { scale: "H6", cls: "h6", weight: "Semi Bold", size: "24px", lh: "140%", ls: "-0.02em" },
  { scale: "Text Extra Large", cls: "t-xl", weight: "Regular", size: "24px", lh: "140%", ls: "-0.01em" },
  { scale: "Text Large", cls: "t-l", weight: "Regular", size: "20px", lh: "140%", ls: "-0.01em" },
  { scale: "Text Regular", cls: "t-r", weight: "Regular", size: "18px", lh: "140%", ls: "-0.01em" },
  { scale: "Text Small", cls: "t-s", weight: "Regular", size: "16px", lh: "140%", ls: "-0.01em" },
  { scale: "Text Extra Small", cls: "t-xs", weight: "Regular", size: "14px", lh: "140%", ls: "-0.01em" },
];

export default function StyleGuidePage() {
  return (
    <>
      <PageHero
        title="Style Guide"
        text="Our style guide lets you manage the website's look and feel. Styles and components are documented, and changes are immediately visible."
      />
      <section className="util">
        <div className="container sg">
          <section>
            <h2 className="h2" data-reveal="fade">
              Color
            </h2>
            <div className="swatches-wrap" data-reveal="fade">
              {COLORS.map((g) => (
                <div className="swatch-group" key={g.group}>
                  <p>{g.group}</p>
                  <div className="swatches">
                    {g.items.map(([label, value]) => (
                      <div className="swatch" key={label}>
                        <i style={{ background: value }} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="h2" data-reveal="fade">
              Typography Style
            </h2>
            <div className="type-table-wrap" data-reveal="fade">
              <table className="type-table">
                <thead>
                  <tr>
                    <th>Scale</th>
                    <th>Font Name</th>
                    <th>Weight</th>
                    <th>Size</th>
                    <th>Line Height</th>
                    <th>Letter Spacing</th>
                  </tr>
                </thead>
                <tbody>
                  {TYPE.map((t) => (
                    <tr key={t.scale}>
                      <td className="scale">
                        <span className={t.cls}>{t.scale}</span>
                      </td>
                      <td>Inter Display</td>
                      <td>{t.weight}</td>
                      <td>{t.size}</td>
                      <td>{t.lh}</td>
                      <td>{t.ls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h2 className="h2" data-reveal="fade">
              Button
            </h2>
            <div className="sg-buttons" data-reveal="fade" style={{ alignItems: "center" }}>
              <Button href="/contact">Get Started</Button>
              <Button href="/contact" variant="secondary">
                Get Started
              </Button>
              <PlainButton href="/contact">Get Started</PlainButton>
              <TextLink href="/contact">Get Started</TextLink>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}

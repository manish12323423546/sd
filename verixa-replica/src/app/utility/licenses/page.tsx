import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = { title: { absolute: "Licenses – Verixa" } };

const LICENSES = [
  { title: "Images", label: "Freepik: Licence", href: "https://www.freepik.com/legal/terms-of-use" },
  { title: "Fonts", label: "Inter Display: Licence", href: "https://github.com/rsms/inter/blob/master/LICENSE.txt" },
  { title: "Icon", label: "Hugeicons: Licence", href: "https://hugeicons.com/license" },
];

export default function LicensesPage() {
  return (
    <>
      <PageHero
        title="License"
        text="All graphical assets in this template are licensed for personal and commercial use. If you'd like to use a specific asset, please check the license below."
      />
      <section className="util">
        <div className="container license-list">
          {LICENSES.map((l) => (
            <div className="license-item" key={l.title} data-reveal="group">
              <h2 className="t-l">{l.title}</h2>
              <ul>
                <li className="t-r">
                  <a href={l.href} target="_blank" rel="noopener noreferrer">
                    {l.label}
                  </a>
                </li>
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

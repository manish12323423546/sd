/* Gujarati / English switch for the static pages. Pages are generated in Gujarati (rebrand/i18n.js);
   this module swaps the known strings in either direction on the client and remembers the choice. */
import G from "@/rebrand/gu.json";
import { createTranslator } from "@/lib/i18n-core";

export type Lang = "gu" | "en";
export const LANG_KEY = "hk-lang";
export const DEFAULT_LANG: Lang = "gu";

const T = createTranslator(G as { exact: Record<string, string>; months: Record<string, string> });

/** Translate one string (whitespace preserved). Returns the input when nothing matches. */
export const translate = (text: string, lang: Lang): string => T.translate(text, lang);

export function getLang(): Lang {
  try { const v = window.localStorage.getItem(LANG_KEY); if (v === "en" || v === "gu") return v; } catch { /* storage unavailable */ }
  return DEFAULT_LANG;
}

export function setLang(lang: Lang) {
  try { window.localStorage.setItem(LANG_KEY, lang); } catch { /* storage unavailable */ }
  applyLang(document, lang);
  window.dispatchEvent(new CustomEvent<Lang>("hk-lang", { detail: lang }));
}

const ATTRS = ["alt", "placeholder", "aria-label", "value", "title"];
const SKIP = /^(SCRIPT|STYLE|TEXTAREA)$/;

/** Rewrite every known string inside `root` (text nodes, a few attributes, the document title) into `lang`. */
export function applyLang(root: Node, lang: Lang) {
  const doc = root.nodeType === 9 ? (root as Document) : root.ownerDocument!;
  if (root === doc || root === doc.documentElement) {
    doc.documentElement.lang = lang;
    doc.title = translate(doc.title, lang);
    const md = doc.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", translate(md.getAttribute("content") || "", lang));
    root = doc.body;
  }
  const skipEl = (el: Element) => SKIP.test(el.tagName) || el.hasAttribute("data-no-i18n");
  if (root.nodeType === 1 && skipEl(root as Element)) return;
  if (root.nodeType === 3) { const t = root as Text; const v = translate(t.data, lang); if (v !== t.data) t.data = v; return; }
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (n.nodeType === 1) return skipEl(n as Element) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const texts: Text[] = [];
  const els: Element[] = [root.nodeType === 1 ? (root as Element) : null].filter(Boolean) as Element[];
  let n: Node | null;
  while ((n = walker.nextNode())) { if (n.nodeType === 3) texts.push(n as Text); else els.push(n as Element); }
  for (const t of texts) { const v = translate(t.data, lang); if (v !== t.data) t.data = v; }
  for (const el of els) {
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      if (a === "value" && !(el instanceof HTMLInputElement && /^(submit|button|reset)$/.test(el.type))) continue;
      const v = el.getAttribute(a) || "";
      const out = translate(v, lang);
      if (out !== v) el.setAttribute(a, out);
    }
  }
  if (root.nodeType === 1) (root as Element).querySelectorAll<HTMLElement>("[data-lang-toggle]").forEach((t) => t.setAttribute("data-current", lang));
  else doc.querySelectorAll<HTMLElement>("[data-lang-toggle]").forEach((t) => t.setAttribute("data-current", lang));
}

/** Bind the header language toggles found inside `root`. */
export function bindLangToggles(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("[data-lang-toggle]").forEach((t) => {
    if (t.dataset.bound) return;
    t.dataset.bound = "1";
    t.setAttribute("data-current", getLang());
    t.addEventListener("click", (e) => {
      e.preventDefault();
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-lang]");
      const next: Lang = target ? (target.dataset.lang as Lang) : getLang() === "gu" ? "en" : "gu";
      if (next !== getLang()) setLang(next);
    });
  });
}

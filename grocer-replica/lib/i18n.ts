/* Gujarati / English switch for the static pages. Pages are generated in Gujarati (rebrand/i18n.js), so a
   Gujarati visitor needs no dictionary at all; the full dictionary (rebrand/gu.json) is loaded only when
   English is chosen or remembered, and the choice is kept in localStorage. */
import { createTranslator, type Translator } from "@/lib/i18n-core";

export type Lang = "gu" | "en";
export const LANG_KEY = "hk-lang";
export const DEFAULT_LANG: Lang = "gu";

/* The few strings the widgets insert at runtime, so Gujarati pages never need the big dictionary. */
const SMALL: Record<string, string> = {
  "Demo form: this replica is not connected to a backend, so nothing is sent or stored.": "ડેમો ફોર્મ: આ વેબસાઇટ બેકએન્ડ સાથે જોડાયેલી નથી, તેથી કંઈ મોકલાતું કે સંગ્રહાતું નથી.",
  "Demo store: the cart and checkout are not connected, so nothing is added or charged.": "ડેમો સ્ટોર: કાર્ટ અને ચેકઆઉટ જોડાયેલાં નથી, તેથી કંઈ ઉમેરાતું કે વસૂલાતું નથી.",
  "Demo: nothing was sent. Demo form: this replica is not connected to a backend, so nothing is sent or stored.": "ડેમો: કંઈ મોકલાયું નથી. ડેમો ફોર્મ: આ વેબસાઇટ બેકએન્ડ સાથે જોડાયેલી નથી, તેથી કંઈ મોકલાતું કે સંગ્રહાતું નથી."
};

let T: Translator | null = null;
let loading: Promise<Translator> | null = null;

/** Load the full dictionary once (only needed for English, or for switching back from it). */
export function loadDictionary(): Promise<Translator> {
  if (T) return Promise.resolve(T);
  if (!loading) loading = import("@/rebrand/gu.json").then((m) => { T = createTranslator(m.default as { exact: Record<string, string>; months: Record<string, string> }); return T; });
  return loading;
}

/** Translate one string with what is loaded (whitespace preserved). Returns the input when nothing matches. */
export function translate(text: string, lang: Lang): string {
  if (T) return T.translate(text, lang);
  if (lang === "gu") { const key = text.replace(/[\s\u00a0]+/g, " ").trim(); if (key in SMALL) return (text.match(/^\s*/) as RegExpMatchArray)[0] + SMALL[key] + (text.match(/\s*$/) as RegExpMatchArray)[0]; }
  return text;
}

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

const markToggles = (root: ParentNode, lang: Lang) => root.querySelectorAll<HTMLElement>("[data-lang-toggle]").forEach((t) => t.setAttribute("data-current", lang));

/** Rewrite every known string inside `root` (text nodes, a few attributes, the document title) into `lang`.
    Gujarati needs no dictionary (the markup is Gujarati already) unless the page was switched to English before. */
export function applyLang(root: Node, lang: Lang) {
  const doc = root.nodeType === 9 ? (root as Document) : root.ownerDocument!;
  if (root === doc || root === doc.documentElement) doc.documentElement.lang = lang;
  markToggles(root.nodeType === 1 ? (root as Element) : doc, lang);
  if (lang === "gu" && !T && !loading) return;
  loadDictionary().then((t) => rewrite(root, lang, t));
}

function rewrite(root: Node, lang: Lang, t: Translator) {
  const doc = root.nodeType === 9 ? (root as Document) : root.ownerDocument!;
  if (root === doc || root === doc.documentElement) {
    doc.title = t.translate(doc.title, lang);
    const md = doc.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", t.translate(md.getAttribute("content") || "", lang));
    root = doc.body;
  }
  if (!root.isConnected) return;
  const skipEl = (el: Element) => SKIP.test(el.tagName) || el.hasAttribute("data-no-i18n");
  if (root.nodeType === 1 && skipEl(root as Element)) return;
  if (root.nodeType === 3) { const x = root as Text; const v = t.translate(x.data, lang); if (v !== x.data) x.data = v; return; }
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (n.nodeType === 1) return skipEl(n as Element) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const texts: Text[] = [];
  const els: Element[] = root.nodeType === 1 ? [root as Element] : [];
  let n: Node | null;
  while ((n = walker.nextNode())) { if (n.nodeType === 3) texts.push(n as Text); else els.push(n as Element); }
  for (const x of texts) { const v = t.translate(x.data, lang); if (v !== x.data) x.data = v; }
  for (const el of els) {
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      if (a === "value" && !(el instanceof HTMLInputElement && /^(submit|button|reset)$/.test(el.type))) continue;
      const v = el.getAttribute(a) || "";
      const out = t.translate(v, lang);
      if (out !== v) el.setAttribute(a, out);
    }
  }
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
    // Warm the dictionary on intent so the first switch is instant.
    const warm = () => { loadDictionary(); };
    t.addEventListener("pointerenter", warm, { once: true });
    t.addEventListener("focus", warm, { once: true });
  });
}

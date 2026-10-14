/*
 * Behaviour for the Webflow widgets kept in the generated markup: dropdowns, tabs, sliders,
 * the (mock) forms, the ecommerce cart modal and current-page link marking.
 * Everything binds to existing DOM nodes and is safe to call again for newly added subtrees.
 */
import { getLang, translate } from "@/lib/i18n";
import { animate } from "framer-motion";

const bound = new WeakSet<Element>();
export const DEMO_FORM_NOTE = "Demo form: this replica is not connected to a backend, so nothing is sent or stored.";
export const DEMO_CART_NOTE = "Demo store: the cart and checkout are not connected, so nothing is added or charged.";

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent("demo-toast", { detail: translate(message, getLang()) }));
}

function waitFor(el: Element, name: string): Promise<void> {
  // Dispatches a widget event; IX2 handlers may hand back a promise through detail.wait.
  let p: Promise<unknown> = Promise.resolve();
  el.dispatchEvent(new CustomEvent(name, { detail: { wait: (x: Promise<unknown>) => { p = x; } } }));
  return p.then(() => undefined, () => undefined);
}

// ---------- dropdowns ----------
function bindDropdown(dd: HTMLElement) {
  const toggle = dd.querySelector<HTMLElement>(":scope > .w-dropdown-toggle");
  const list = dd.querySelector<HTMLElement>(":scope > .w-dropdown-list");
  if (!toggle || !list) return;
  const hover = dd.getAttribute("data-hover") === "true";
  const delay = Number(dd.getAttribute("data-delay") || 0);
  let open = false;
  let timer = 0;
  let closing = false;
  toggle.setAttribute("role", "button");
  toggle.setAttribute("tabindex", "0");
  toggle.setAttribute("aria-expanded", "false");
  list.setAttribute("aria-hidden", "true");
  const doOpen = () => {
    window.clearTimeout(timer);
    if (open) return;
    open = true; closing = false;
    toggle.classList.add("w--open"); list.classList.add("w--open");
    toggle.setAttribute("aria-expanded", "true"); list.setAttribute("aria-hidden", "false");
    void waitFor(dd, "wf-dropdown-open");
  };
  const doClose = () => {
    window.clearTimeout(timer);
    if (!open || closing) return;
    closing = true;
    toggle.setAttribute("aria-expanded", "false"); list.setAttribute("aria-hidden", "true");
    void waitFor(dd, "wf-dropdown-close").then(() => {
      if (!closing) return;
      open = false; closing = false;
      toggle.classList.remove("w--open"); list.classList.remove("w--open");
    });
  };
  toggle.addEventListener("click", (e) => { e.preventDefault(); if (open && !closing) doClose(); else doOpen(); });
  toggle.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle.click(); } if (e.key === "Escape") doClose(); });
  if (hover) {
    dd.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") doOpen(); });
    dd.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") timer = window.setTimeout(doClose, delay); });
  }
  document.addEventListener("click", (e) => { if (open && !dd.contains(e.target as Node)) doClose(); });
}

// ---------- tabs ----------
function bindTabs(tabs: HTMLElement) {
  const links = Array.from(tabs.querySelectorAll<HTMLElement>(".w-tab-link"));
  const panes = Array.from(tabs.querySelectorAll<HTMLElement>(".w-tab-pane"));
  const durIn = Number(tabs.getAttribute("data-duration-in") || 300) / 1000;
  tabs.querySelector(".w-tab-menu")?.setAttribute("role", "tablist");
  panes.forEach((p) => { p.setAttribute("role", "tabpanel"); p.setAttribute("aria-label", p.getAttribute("data-w-tab") || "Tab"); });
  links.forEach((link) => {
    link.setAttribute("role", "tab");
    link.setAttribute("tabindex", "0");
    const go = () => {
      const name = link.getAttribute("data-w-tab");
      links.forEach((l) => { const cur = l === link; l.classList.toggle("w--current", cur); l.setAttribute("aria-selected", String(cur)); });
      panes.forEach((p) => {
        const cur = p.getAttribute("data-w-tab") === name;
        if (cur && !p.classList.contains("w--tab-active")) { p.classList.add("w--tab-active"); animate(p, { opacity: [0, 1] }, { duration: durIn }); }
        else if (!cur) p.classList.remove("w--tab-active");
      });
    };
    link.addEventListener("click", (e) => { e.preventDefault(); go(); });
    link.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });
}

// ---------- sliders ----------
function bindSlider(slider: HTMLElement) {
  const mask = slider.querySelector<HTMLElement>(":scope > .w-slider-mask");
  if (!mask) return;
  const slides = Array.from(mask.querySelectorAll<HTMLElement>(":scope > .w-slide"));
  if (slides.length < 2) return;
  const left = slider.querySelector<HTMLElement>(":scope > .w-slider-arrow-left");
  const right = slider.querySelector<HTMLElement>(":scope > .w-slider-arrow-right");
  const nav = slider.querySelector<HTMLElement>(":scope > .w-slider-nav");
  const autoplay = slider.getAttribute("data-autoplay") === "true";
  const delay = Number(slider.getAttribute("data-delay") || 4000);
  const duration = Number(slider.getAttribute("data-duration") || 500) / 1000;
  const infinite = slider.getAttribute("data-infinite") === "true";
  let index = 0;
  let timer = 0;
  let hovered = false;
  const dots: HTMLElement[] = [];
  if (nav) {
    nav.innerHTML = "";
    const num = nav.classList.contains("w-num");
    slides.forEach((_, i) => {
      const d = document.createElement("div");
      d.className = "w-slider-dot" + (i === 0 ? " w-active" : "");
      d.setAttribute("role", "button");
      d.setAttribute("tabindex", "0");
      d.setAttribute("aria-label", `Show slide ${i + 1} of ${slides.length}`);
      if (num) d.textContent = String(i + 1);
      d.addEventListener("click", () => goTo(i));
      d.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goTo(i); } });
      nav.appendChild(d); dots.push(d);
    });
  }
  const setActive = (i: number) => slides.forEach((s, k) => { const cur = k === i; s.setAttribute("aria-hidden", String(!cur)); if (cur) s.removeAttribute("inert"); else s.setAttribute("inert", ""); });
  slides.forEach((s, i) => { s.setAttribute("role", "group"); s.setAttribute("aria-label", `${i + 1} of ${slides.length}`); });
  setActive(0);
  const goTo = (i: number, instant = false) => {
    if (i < 0) i = infinite ? slides.length - 1 : 0;
    if (i >= slides.length) i = infinite ? 0 : slides.length - 1;
    index = i;
    const x = `-${index * 100}%`;
    setActive(index);
    slides.forEach((s) => {
      if (instant) s.style.transform = `translateX(${x})`;
      else animate(s, { x }, { duration, ease: [0.25, 0.1, 0.25, 1] });
    });
    dots.forEach((d, k) => d.classList.toggle("w-active", k === index));
    restart();
  };
  const restart = () => {
    window.clearInterval(timer);
    if (autoplay) timer = window.setInterval(() => { if (!hovered && document.visibilityState === "visible") goTo(index + 1); }, delay);
  };
  left?.addEventListener("click", () => goTo(index - 1));
  right?.addEventListener("click", () => goTo(index + 1));
  left?.setAttribute("aria-label", "Previous slide");
  right?.setAttribute("aria-label", "Next slide");
  [left, right].forEach((a) => { if (a) { a.setAttribute("role", "button"); a.setAttribute("tabindex", "0"); a.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); a.click(); } }); } });
  slider.addEventListener("pointerenter", () => { hovered = true; });
  slider.addEventListener("pointerleave", () => { hovered = false; });
  // swipe
  let startX: number | null = null;
  mask.addEventListener("pointerdown", (e) => { startX = e.clientX; });
  mask.addEventListener("pointerup", (e) => { if (startX === null) return; const dx = e.clientX - startX; startX = null; if (Math.abs(dx) > 40) goTo(index + (dx < 0 ? 1 : -1)); });
  mask.addEventListener("pointercancel", () => { startX = null; });
  restart();
}

// ---------- forms (mock, clearly labelled) ----------
function addNote(parent: Element, text: string, cls = "demo-form-note") {
  if (parent.querySelector(":scope > ." + cls)) return;
  const n = document.createElement("p");
  n.className = cls;
  n.setAttribute("role", "note");
  n.textContent = translate(text, getLang());
  parent.appendChild(n);
}
function bindForm(form: HTMLFormElement) {
  const isCart = form.classList.contains("w-commerce-commerceaddtocartform");
  const isCheckout = /w-commerce-commercecheckout/.test(form.className);
  if (!isCart && !isCheckout) addNote(form, DEMO_FORM_NOTE);
  form.setAttribute("data-demo-form", "true");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCart) { toast(DEMO_CART_NOTE); return; }
    toast(DEMO_FORM_NOTE);
    const note = form.querySelector<HTMLElement>(":scope > .demo-form-note");
    if (note) { note.textContent = translate("Demo: nothing was sent. " + DEMO_FORM_NOTE, getLang()); note.classList.add("is-submitted"); }
    form.reset();
  });
}

// ---------- ecommerce cart modal ----------
function bindCart(wrapper: HTMLElement) {
  const openLink = wrapper.querySelector<HTMLElement>(".w-commerce-commercecartopenlink");
  const modal = wrapper.querySelector<HTMLElement>(".w-commerce-commercecartcontainerwrapper");
  const closeLink = wrapper.querySelector<HTMLElement>(".w-commerce-commercecartcloselink");
  const empty = wrapper.querySelector<HTMLElement>(".w-commerce-commercecartemptystate");
  if (!openLink || !modal) return;
  if (empty) addNote(empty, DEMO_CART_NOTE, "demo-cart-note");
  modal.style.display = "none";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Your cart");
  const open = (e: Event) => { e.preventDefault(); modal.style.display = "flex"; closeLink?.focus(); };
  const close = (e?: Event) => { e?.preventDefault(); modal.style.display = "none"; };
  openLink.setAttribute("role", "button"); openLink.setAttribute("href", "#cart");
  openLink.addEventListener("click", open);
  closeLink?.addEventListener("click", close);
  closeLink?.setAttribute("role", "button"); closeLink?.setAttribute("tabindex", "0"); closeLink?.setAttribute("aria-label", "Close cart");
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.style.display !== "none") close(); });
  wrapper.querySelectorAll<HTMLElement>(".w-commerce-commercecartcheckoutbutton, .w-commerce-commercecartapplepaybutton, .w-commerce-commercecartquickcheckoutbutton").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); toast(DEMO_CART_NOTE); }));
}

// ---------- quantity +/- and buy now ----------
function bindQuantity(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(".w-commerce-commercebuynowbutton, .w-commerce-commercecheckoutplaceorderbutton").forEach((b) => {
    if (bound.has(b)) return; bound.add(b);
    b.addEventListener("click", (e) => { e.preventDefault(); toast(DEMO_CART_NOTE); });
    if (b.classList.contains("w-commerce-commercecheckoutplaceorderbutton") && b.parentElement) addNote(b.parentElement, DEMO_CART_NOTE);
  });
}

// ---------- current links ----------
export function markCurrentLinks(pathname: string) {
  document.querySelectorAll<HTMLAnchorElement>(".header-section a[href], .footer-section a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    const cur = href === pathname || (pathname !== "/" && href !== "/" && pathname.startsWith(href + "/"));
    a.classList.toggle("w--current", cur);
    if (cur) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  // the "Home"/"Pages" dropdown toggles show the current state too
  document.querySelectorAll<HTMLElement>(".header-dropdown").forEach((dd) => {
    const has = !!dd.querySelector("a.w--current");
    dd.querySelector(":scope > .w-dropdown-toggle")?.classList.toggle("w--current", has);
  });
}

// ---------- autoplay videos (React drops the `muted` attribute on the server) ----------
function bindVideo(v: HTMLVideoElement) {
  v.muted = true;
  v.defaultMuted = true;
  v.setAttribute("muted", "");
  v.playsInline = true;
  const p = v.play();
  if (p) p.catch(() => undefined);
}

export function bindWidgets(root: ParentNode) {
  const each = <T extends Element>(sel: string, fn: (el: T) => void) => {
    const list = Array.from(root.querySelectorAll<T>(sel));
    if (root instanceof Element && root.matches(sel)) list.unshift(root as unknown as T);
    for (const el of list) { if (bound.has(el)) continue; bound.add(el); fn(el); }
  };
  each<HTMLElement>(".w-dropdown", bindDropdown);
  each<HTMLElement>(".w-tabs", bindTabs);
  each<HTMLElement>(".w-slider", bindSlider);
  each<HTMLFormElement>("form", bindForm);
  each<HTMLElement>(".w-commerce-commercecartwrapper", bindCart);
  each<HTMLVideoElement>("video[autoplay]", bindVideo);
  bindQuantity(root);
}

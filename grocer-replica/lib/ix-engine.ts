/*
 * Minimal interpreter for the Webflow IX2 interaction data captured from the reference site.
 * The data (lib/ix2-data.json) is treated as configuration, never as code. Tweens run through
 * Framer Motion's imperative `animate()` so timings and easing match the original definitions.
 */
import { animate, type AnimationPlaybackControls } from "framer-motion";
import raw from "./ix2-data.json";

type Target = { selector?: string; useEventTarget?: boolean | string; id?: string };
type ItemConfig = {
  delay?: number; easing?: string; duration?: number; target?: Target;
  xValue?: number; yValue?: number; zValue?: number; xUnit?: string; yUnit?: string; zUnit?: string;
  value?: number | string; widthValue?: number; heightValue?: number; widthUnit?: string; heightUnit?: string;
  rValue?: number; gValue?: number; bValue?: number; aValue?: number;
};
type Item = { type: string; config: ItemConfig };
type Keyframe = { at: number; items: Item[] };
type ContinuousGroup = { id: string; type: string; keys: Keyframe[] };
type List = { initial: boolean; groups: Item[][]; continuous: ContinuousGroup[] };
type ContinuousParam = { continuousParameterGroupId: string; selectedAxis?: string; basedOn?: string; reverse?: boolean; smoothing?: number; restingState?: number; startsEntering?: boolean; addStartOffset?: boolean; addOffsetValue?: number; startsExiting?: boolean; addEndOffset?: boolean; endsExiting?: boolean };
type ScrollConfig = { loop?: boolean; playInReverse?: boolean; scrollOffsetValue?: number | null; scrollOffsetUnit?: string | null };
type Ev = { id: string; type: string; list: string; config: ScrollConfig | ContinuousParam[]; mq: string[]; reverse: boolean; delay: number };
type Data = { mediaQueries: { key: string; min: number; max: number }[]; events: Ev[]; lists: Record<string, List> };

const data = raw as unknown as Data;
const byId = new Map<string, Ev[]>();
for (const e of data.events) { const arr = byId.get(e.id) || []; arr.push(e); byId.set(e.id, arr); }

const EASE: Record<string, [number, number, number, number] | "linear"> = {
  ease: [0.25, 0.1, 0.25, 1], easeIn: [0.42, 0, 1, 1], easeOut: [0, 0, 0.58, 1], easeInOut: [0.42, 0, 0.58, 1], linear: "linear",
  inQuad: [0.55, 0.085, 0.68, 0.53], outQuad: [0.25, 0.46, 0.45, 0.94], inOutQuad: [0.455, 0.03, 0.515, 0.955],
  inCubic: [0.55, 0.055, 0.675, 0.19], outCubic: [0.215, 0.61, 0.355, 1], inOutCubic: [0.645, 0.045, 0.355, 1],
  inQuart: [0.895, 0.03, 0.685, 0.22], outQuart: [0.165, 0.84, 0.44, 1], inOutQuart: [0.77, 0, 0.175, 1],
  inQuint: [0.755, 0.05, 0.855, 0.06], outQuint: [0.23, 1, 0.32, 1], inOutQuint: [0.86, 0, 0.07, 1],
  inSine: [0.47, 0, 0.745, 0.715], outSine: [0.39, 0.575, 0.565, 1], inOutSine: [0.445, 0.05, 0.55, 0.95],
  inExpo: [0.95, 0.05, 0.795, 0.035], outExpo: [0.19, 1, 0.22, 1], inOutExpo: [1, 0, 0, 1],
  inCirc: [0.6, 0.04, 0.98, 0.335], outCirc: [0.075, 0.82, 0.165, 1], inOutCirc: [0.785, 0.135, 0.15, 0.86],
  inBack: [0.6, -0.28, 0.735, 0.045], outBack: [0.175, 0.885, 0.32, 1.275], inOutBack: [0.68, -0.55, 0.265, 1.55],
};
const easeOf = (name?: string) => (name && EASE[name]) || EASE.ease;

type TState = { x: number; xu: string; y: number; yu: string; sx: number; sy: number; rz: number };
const states = new WeakMap<Element, TState>();
const running = new WeakMap<Element, Map<string, AnimationPlaybackControls>>();
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function stateOf(el: Element): TState {
  let s = states.get(el);
  if (s) return s;
  s = { x: 0, xu: "px", y: 0, yu: "px", sx: 1, sy: 1, rz: 0 };
  const t = (el as HTMLElement).style.transform || "";
  const m = t.match(/translate3d\(([-\d.]+)(px|%|vh|vw)?,\s*([-\d.]+)(px|%|vh|vw)?/);
  if (m) { s.x = +m[1]; s.xu = m[2] || "px"; s.y = +m[3]; s.yu = m[4] || "px"; }
  const sc = t.match(/scale3d\(([-\d.]+),\s*([-\d.]+)/);
  if (sc) { s.sx = +sc[1]; s.sy = +sc[2]; }
  const rz = t.match(/rotateZ\(([-\d.]+)(deg)?\)/);
  if (rz) s.rz = +rz[1];
  states.set(el, s);
  return s;
}
function writeTransform(el: Element) {
  const s = stateOf(el);
  (el as HTMLElement).style.transform = `translate3d(${s.x}${s.xu}, ${s.y}${s.yu}, 0) scale3d(${s.sx}, ${s.sy}, 1) rotateZ(${s.rz}deg)`;
}
function stopProp(el: Element, prop: string) {
  const m = running.get(el);
  const c = m?.get(prop);
  if (c) { c.stop(); m!.delete(prop); }
}
function track(el: Element, prop: string, c: AnimationPlaybackControls) {
  let m = running.get(el);
  if (!m) { m = new Map(); running.set(el, m); }
  m.set(prop, c);
}
function tween(el: Element, prop: string, from: number, to: number, cfg: ItemConfig, instant: boolean, set: (v: number) => void): Promise<void> {
  stopProp(el, prop);
  const duration = instant ? 0 : (cfg.duration || 0) / 1000;
  const delay = instant ? 0 : (cfg.delay || 0) / 1000;
  if (duration === 0 && delay === 0) { set(to); return Promise.resolve(); }
  if (from === to && delay === 0) { set(to); return Promise.resolve(); }
  const c = animate(from, to, { duration, delay, ease: easeOf(cfg.easing), onUpdate: set });
  track(el, prop, c);
  return c.then(() => undefined);
}
const unitOf = (u?: string, fallback = "px") => (u && u !== "PX" ? u.toLowerCase() : fallback);

function resolveTargets(el: Element, t?: Target): Element[] {
  if (!t || t.useEventTarget === true || (!t.selector && !t.id)) return [el];
  const sel = t.selector!;
  try {
    if (t.useEventTarget === "CHILDREN") return Array.from(el.querySelectorAll(sel));
    if (t.useEventTarget === "SIBLINGS") return Array.from(el.parentElement?.children || []).filter((c) => c !== el && c.matches(sel));
    if (t.useEventTarget === "PARENT") { const p = el.parentElement?.closest(sel); return p ? [p] : []; }
    return Array.from(document.querySelectorAll(sel));
  } catch { return []; }
}

function applyItem(el: Element, item: Item, instant: boolean): Promise<void> {
  const cfg = item.config;
  const targets = resolveTargets(el, cfg.target);
  return Promise.all(targets.map((t) => applyTo(t as HTMLElement, item, instant))).then(() => undefined);
}

function applyTo(el: HTMLElement, item: Item, instant: boolean): Promise<void> {
  const cfg = item.config;
  const s = stateOf(el);
  const ps: Promise<void>[] = [];
  switch (item.type) {
    case "TRANSFORM_MOVE": {
      if (cfg.xValue !== undefined) { s.xu = unitOf(cfg.xUnit); ps.push(tween(el, "x", s.x, cfg.xValue, cfg, instant, (v) => { s.x = v; writeTransform(el); })); }
      if (cfg.yValue !== undefined) { s.yu = unitOf(cfg.yUnit); ps.push(tween(el, "y", s.y, cfg.yValue, cfg, instant, (v) => { s.y = v; writeTransform(el); })); }
      if (cfg.xValue === undefined && cfg.yValue === undefined) writeTransform(el);
      break;
    }
    case "TRANSFORM_SCALE": {
      const sx = cfg.xValue ?? s.sx, sy = cfg.yValue ?? s.sy;
      ps.push(tween(el, "sx", s.sx, sx, cfg, instant, (v) => { s.sx = v; writeTransform(el); }));
      ps.push(tween(el, "sy", s.sy, sy, cfg, instant, (v) => { s.sy = v; writeTransform(el); }));
      break;
    }
    case "TRANSFORM_ROTATE": {
      if (cfg.zValue !== undefined) ps.push(tween(el, "rz", s.rz, cfg.zValue, cfg, instant, (v) => { s.rz = v; writeTransform(el); }));
      break;
    }
    case "STYLE_OPACITY": {
      const from = el.style.opacity !== "" ? parseFloat(el.style.opacity) : parseFloat(getComputedStyle(el).opacity);
      ps.push(tween(el, "opacity", isNaN(from) ? 1 : from, Number(cfg.value), cfg, instant, (v) => { el.style.opacity = String(v); }));
      break;
    }
    case "STYLE_SIZE": {
      const axis = (prop: "width" | "height", unit?: string, value?: number) => {
        if (unit === "AUTO") {
          const current = el.getBoundingClientRect()[prop];
          const prev = el.style[prop];
          el.style[prop] = "auto";
          const target = el.getBoundingClientRect()[prop];
          el.style[prop] = prev || `${current}px`;
          ps.push(tween(el, prop, current, target, cfg, instant, (v) => { el.style[prop] = `${v}px`; }).then(() => { el.style[prop] = "auto"; }));
        } else if (value !== undefined) {
          const u = unitOf(unit);
          const cur = el.style[prop];
          let from: number;
          if (cur && cur.endsWith(u)) from = parseFloat(cur);
          else if (u === "px") from = el.getBoundingClientRect()[prop];
          else if (u === "%") { const parent = el.parentElement?.getBoundingClientRect()[prop] || 1; from = (el.getBoundingClientRect()[prop] / parent) * 100; }
          else from = value;
          ps.push(tween(el, prop, from, value, cfg, instant, (v) => { el.style[prop] = `${v}${u}`; }));
        }
      };
      axis("width", cfg.widthUnit, cfg.widthValue);
      axis("height", cfg.heightUnit, cfg.heightValue);
      break;
    }
    case "GENERAL_DISPLAY": {
      const delay = instant ? 0 : cfg.delay || 0;
      ps.push(new Promise<void>((res) => { const timer = window.setTimeout(() => { el.style.display = String(cfg.value); res(); }, delay); track(el, "display", { stop: () => { window.clearTimeout(timer); res(); } } as unknown as AnimationPlaybackControls); }));
      break;
    }
    case "STYLE_BACKGROUND_COLOR": {
      const to = `rgba(${cfg.rValue ?? 0}, ${cfg.gValue ?? 0}, ${cfg.bValue ?? 0}, ${cfg.aValue ?? 1})`;
      const from = getComputedStyle(el).backgroundColor || "rgba(0,0,0,0)";
      stopProp(el, "bg");
      const duration = instant ? 0 : (cfg.duration || 0) / 1000;
      if (duration === 0) { el.style.backgroundColor = to; break; }
      const c = animate(from, to, { duration, delay: instant ? 0 : (cfg.delay || 0) / 1000, ease: easeOf(cfg.easing), onUpdate: (v) => { el.style.backgroundColor = String(v); } });
      track(el, "bg", c);
      ps.push(c.then(() => undefined));
      break;
    }
    default:
      break;
  }
  return Promise.all(ps).then(() => undefined);
}

async function runList(el: Element, list: List, opts: { instant?: boolean; skipInitial?: boolean } = {}) {
  let i = 0;
  if (list.initial) { if (!opts.skipInitial) await Promise.all(list.groups[0].map((it) => applyItem(el, it, true))); i = 1; }
  for (; i < list.groups.length; i++) await Promise.all(list.groups[i].map((it) => applyItem(el, it, !!opts.instant)));
}
function applyInitial(el: Element, list: List) {
  if (list.initial && list.groups[0]) for (const it of list.groups[0]) void applyItem(el, it, true);
}

// ---------- continuous (mouse / scroll progress) ----------
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function applyContinuous(el: Element, group: ContinuousGroup, p: number) {
  const keys = group.keys;
  if (!keys.length) return;
  let a = keys[0], b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (p >= keys[i].at && p <= keys[i + 1].at) { a = keys[i]; b = keys[i + 1]; break; }
  const t = p <= a.at ? 0 : p >= b.at ? 1 : (p - a.at) / (b.at - a.at || 1);
  a.items.forEach((ia, idx) => {
    const ib = b.items[idx] || ia;
    const targets = resolveTargets(el, ia.config.target);
    for (const tg of targets) {
      const s = stateOf(tg);
      if (ia.type === "TRANSFORM_MOVE") {
        if (ia.config.xValue !== undefined || ib.config.xValue !== undefined) { s.xu = unitOf(ia.config.xUnit); s.x = lerp(ia.config.xValue ?? 0, ib.config.xValue ?? 0, t); }
        if (ia.config.yValue !== undefined || ib.config.yValue !== undefined) { s.yu = unitOf(ia.config.yUnit); s.y = lerp(ia.config.yValue ?? 0, ib.config.yValue ?? 0, t); }
        writeTransform(tg);
      } else if (ia.type === "TRANSFORM_SCALE") {
        s.sx = lerp(ia.config.xValue ?? 1, ib.config.xValue ?? 1, t); s.sy = lerp(ia.config.yValue ?? 1, ib.config.yValue ?? 1, t); writeTransform(tg);
      } else if (ia.type === "TRANSFORM_ROTATE") {
        s.rz = lerp(ia.config.zValue ?? 0, ib.config.zValue ?? 0, t); writeTransform(tg);
      } else if (ia.type === "STYLE_OPACITY") {
        (tg as HTMLElement).style.opacity = String(lerp(Number(ia.config.value), Number(ib.config.value), t));
      }
    }
  });
}

class Smooth {
  current: number; target: number; raf = 0;
  constructor(initial: number, private factor: number, private onFrame: (v: number) => void) { this.current = initial; this.target = initial; }
  set(v: number) { this.target = v; this.kick(); }
  kick() { if (!this.raf) this.raf = requestAnimationFrame(() => this.step()); }
  step() {
    this.raf = 0;
    this.current = lerp(this.current, this.target, this.factor);
    if (Math.abs(this.current - this.target) < 0.05) this.current = this.target;
    this.onFrame(this.current);
    if (this.current !== this.target) this.kick();
  }
  stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
}

// ---------- binding ----------
const bound = new WeakSet<Element>();
const cleanups = new WeakMap<Element, (() => void)[]>();
const ioHandlers = new WeakMap<Element, Map<string, (() => void)[]>>();
const observers = new Map<string, IntersectionObserver>();
const scrollTrackers = new Set<() => void>();
let scrollRaf = 0;

function mqKey() {
  const w = window.innerWidth;
  return (data.mediaQueries.find((m) => w >= m.min && w <= m.max) || data.mediaQueries[0]).key;
}
function observe(el: Element, offsetPct: number, cb: () => void) {
  const margin = `0px 0px -${offsetPct}% 0px`;
  let obs = observers.get(margin);
  if (!obs) {
    obs = new IntersectionObserver((entries, o) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const m = ioHandlers.get(en.target);
        const cbs = m?.get(margin);
        o.unobserve(en.target);
        m?.delete(margin);
        cbs?.forEach((f) => f());
      }
    }, { rootMargin: margin, threshold: 0 });
    observers.set(margin, obs);
  }
  let m = ioHandlers.get(el);
  if (!m) { m = new Map(); ioHandlers.set(el, m); }
  const arr = m.get(margin) || [];
  arr.push(cb);
  m.set(margin, arr);
  obs.observe(el);
}
function onScroll() {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; scrollTrackers.forEach((f) => f()); });
}

export function bindElement(el: Element) {
  if (bound.has(el)) return;
  const id = el.getAttribute("data-w-id");
  if (!id) return;
  bound.add(el);
  const evs = (byId.get(id) || []).filter((e) => e.mq.includes(mqKey()));
  const cl: (() => void)[] = [];
  cleanups.set(el, cl);
  const html = el as HTMLElement;
  let hasScrollReveal = false;
  let clickList: List | null = null;
  let secondClickList: List | null = null;
  const instant = reduced();

  for (const ev of evs) {
    const list = data.lists[ev.list];
    if (!list) continue;
    switch (ev.type) {
      case "SCROLL_INTO_VIEW": {
        hasScrollReveal = true;
        // Above-the-fold media wrappers (data-ix-eager) render visible on first paint; the reveal
        // still runs but from the visible state, so there is nothing to hide first.
        if (!el.hasAttribute("data-ix-eager")) applyInitial(el, list);
        const off = (ev.config as ScrollConfig)?.scrollOffsetValue ?? 0;
        observe(el, off, () => { void runList(el, list, { instant, skipInitial: true }); });
        break;
      }
      case "MOUSE_OVER": {
        applyInitial(el, list);
        const h = () => { void runList(el, list, { skipInitial: true }); };
        el.addEventListener("pointerenter", h); cl.push(() => el.removeEventListener("pointerenter", h));
        break;
      }
      case "MOUSE_OUT": {
        const h = () => { void runList(el, list, { skipInitial: true }); };
        el.addEventListener("pointerleave", h); cl.push(() => el.removeEventListener("pointerleave", h));
        break;
      }
      case "DROPDOWN_OPEN": {
        applyInitial(el, list);
        const h = (e: Event) => { const d = (e as CustomEvent).detail; const p = runList(el, list, { skipInitial: true }); if (d?.wait) d.wait(p); };
        el.addEventListener("wf-dropdown-open", h); cl.push(() => el.removeEventListener("wf-dropdown-open", h));
        break;
      }
      case "DROPDOWN_CLOSE": {
        const h = (e: Event) => { const d = (e as CustomEvent).detail; const p = runList(el, list, { skipInitial: true }); if (d?.wait) d.wait(p); };
        el.addEventListener("wf-dropdown-close", h); cl.push(() => el.removeEventListener("wf-dropdown-close", h));
        break;
      }
      case "MOUSE_CLICK": {
        applyInitial(el, list);
        clickList = list;
        break;
      }
      case "MOUSE_SECOND_CLICK": {
        secondClickList = list;
        break;
      }
      case "MOUSE_MOVE": {
        const params = ev.config as ContinuousParam[];
        for (const p of params) {
          const group = list.continuous.find((g) => g.id === p.continuousParameterGroupId);
          if (!group) continue;
          const rest = p.restingState ?? 50;
          const sm = new Smooth(rest, 1 - Math.min(0.95, (p.smoothing ?? 50) / 100), (v) => applyContinuous(el, group, v));
          applyContinuous(el, group, rest);
          const move = (ev2: Event) => {
            const e = ev2 as PointerEvent;
            const r = el.getBoundingClientRect();
            let v = group.type === "MOUSE_X" ? ((e.clientX - r.left) / (r.width || 1)) * 100 : ((e.clientY - r.top) / (r.height || 1)) * 100;
            v = Math.max(0, Math.min(100, v));
            if (p.reverse) v = 100 - v;
            sm.set(v);
          };
          const leave = () => sm.set(rest);
          el.addEventListener("pointermove", move); el.addEventListener("pointerleave", leave);
          cl.push(() => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); sm.stop(); });
        }
        break;
      }
      case "SCROLLING_IN_VIEW": {
        const params = ev.config as ContinuousParam[];
        for (const p of params) {
          const group = list.continuous.find((g) => g.id === p.continuousParameterGroupId);
          if (!group) continue;
          const sm = new Smooth(0, 1 - Math.min(0.95, (p.smoothing ?? 50) / 100), (v) => applyContinuous(el, group, v));
          const tracker = () => {
            const r = el.getBoundingClientRect();
            const vh = window.innerHeight;
            const total = vh + r.height;
            const v = Math.max(0, Math.min(100, ((vh - r.top) / (total || 1)) * 100));
            sm.set(v);
          };
          scrollTrackers.add(tracker);
          tracker();
          cl.push(() => { scrollTrackers.delete(tracker); sm.stop(); });
        }
        break;
      }
      default:
        break;
    }
  }
  if (clickList || secondClickList) {
    // First and second click alternate (Webflow "toggle" interactions, e.g. the mobile menu button).
    let toggled = false;
    const h = () => {
      const list = toggled ? secondClickList : clickList;
      toggled = !toggled;
      if (list) void runList(el, list, { skipInitial: true });
      el.setAttribute("aria-expanded", String(toggled));
    };
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-expanded", "false");
    if (!el.getAttribute("aria-label") && !(el.textContent || "").trim()) el.setAttribute("aria-label", "Toggle menu");
    const k = (e: Event) => { const ke = e as KeyboardEvent; if (ke.key === "Enter" || ke.key === " ") { e.preventDefault(); h(); } };
    el.addEventListener("click", h); el.addEventListener("keydown", k);
    cl.push(() => { el.removeEventListener("click", h); el.removeEventListener("keydown", k); });
  }
  // Safety net: an element published with a hidden initial state but no applicable reveal on this
  // breakpoint (or with motion disabled) must not stay invisible.
  const hiddenInline = html.style.opacity !== "" && parseFloat(html.style.opacity) < 0.05;
  const transformedInline = /scale3d\((1\.\d+|0\.\d+)|translate3d\([^)]*[1-9]\d*px/.test(html.style.transform || "");
  if (!hasScrollReveal && (hiddenInline || transformedInline)) { html.style.opacity = ""; html.style.transform = ""; states.delete(el); }
}

export function unbindElement(el: Element) {
  const cl = cleanups.get(el);
  if (cl) { cl.forEach((f) => f()); cleanups.delete(el); }
  const m = ioHandlers.get(el);
  if (m) { for (const margin of m.keys()) observers.get(margin)?.unobserve(el); ioHandlers.delete(el); }
  bound.delete(el);
}

export function bindTree(root: ParentNode | Element) {
  if (root instanceof Element && root.hasAttribute("data-w-id")) bindElement(root);
  root.querySelectorAll("[data-w-id]").forEach(bindElement);
}

let scrollBound = false;
export function startEngine() {
  if (scrollBound) return;
  scrollBound = true;
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("lenis-scroll", onScroll);
}

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const EASE = "cubic-bezier(.22,1,.36,1)";

/**
 * Port of the original site's "Verixa Effects" code component:
 * - reveals: [data-reveal="split"] headings slide up word by word (800ms, +40ms per word),
 *   [data-reveal="fade"] fades up 24px (900ms); items entering together stagger 80ms,
 *   [data-reveal="group"] children stagger 80ms within their parent.
 * - smooth wheel scrolling on fine pointers (lerp 0.1), off for reduced motion.
 */
export function Effects() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.add("fx-ready");
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])"));
    if (reduce || typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.setAttribute("data-revealed", ""));
      return;
    }

    const animate = (el: HTMLElement, delay: number) => {
      io.unobserve(el);
      if (el.hasAttribute("data-revealed")) return;
      const kind = el.getAttribute("data-reveal");
      if (kind === "split") {
        el.querySelectorAll<HTMLElement>(".vx-wi").forEach((w, i) => {
          w.animate(
            [
              { opacity: 0, transform: "translateY(100%)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 800, delay: delay + i * 40, easing: EASE, fill: "backwards" },
          );
        });
      } else {
        el.animate(
          [
            { opacity: 0, transform: "translateY(24px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 900, delay, easing: EASE, fill: "backwards" },
        );
      }
      el.setAttribute("data-revealed", "");
    };

    const io = new IntersectionObserver(
      (entries) => {
        const vh = window.innerHeight;
        const ready = entries
          .filter((e) => e.isIntersecting && (e.intersectionRatio >= 0.14 || e.intersectionRect.height >= vh * 0.4))
          .map((e) => e.target as HTMLElement)
          .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
        let n = 0;
        const groups = new Map<Element, number>();
        for (const el of ready) {
          let delay: number;
          if (el.getAttribute("data-reveal") === "group" && el.parentElement) {
            const k = groups.get(el.parentElement) ?? 0;
            groups.set(el.parentElement, k + 1);
            delay = Math.min(k, 10) * 80;
          } else {
            delay = Math.min(n, 8) * 80;
            n++;
          }
          animate(el, delay);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));

    // Content mounted later (filters, tabs, client navigation) must be observed too, or it
    // would stay hidden by the html.fx rule.
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          const found = node.matches("[data-reveal]:not([data-revealed])") ? [node] : [];
          found.push(...Array.from(node.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])")));
          found.forEach((el) => io.observe(el));
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // At the very bottom of the page nothing more can scroll into view: reveal what is left.
    const onScroll = () => {
      if (window.scrollY + window.innerHeight < root.scrollHeight - 4) return;
      document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])").forEach((el, i) => {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.top < window.innerHeight && r.bottom > 0) animate(el, Math.min(i, 8) * 80);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const doc = document.documentElement;
    const ease = 0.1;
    let target = window.scrollY;
    let current = target;
    let last = target;
    let raf = 0;
    let running = false;
    let prevTs = 0;
    const max = () => Math.max(0, doc.scrollHeight - doc.clientHeight);
    const sync = () => {
      target = window.scrollY;
      current = target;
      last = target;
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      running = false;
      prevTs = 0;
      doc.style.scrollBehavior = "";
    };
    const scrollable = (node: EventTarget | null) => {
      for (let el = node as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
        const cs = getComputedStyle(el);
        if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight) return true;
      }
      return false;
    };
    const step = (ts: number) => {
      const dt = prevTs ? Math.min(64, ts - prevTs) : 16.67;
      prevTs = ts;
      target = Math.min(target, max());
      const k = 1 - Math.pow(1 - ease, dt / 16.67);
      current += (target - current) * k;
      if (Math.abs(target - current) < 0.5) current = target;
      window.scrollTo(0, current);
      last = current;
      if (current === target) return stop();
      raf = requestAnimationFrame(step);
    };
    const onWheel = (e: WheelEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey) return;
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= window.innerHeight;
      if (!dy || Math.abs(e.deltaX) > Math.abs(dy) || scrollable(e.target)) return;
      if (document.body.style.overflow === "hidden") return;
      e.preventDefault();
      if (!running) sync();
      target = Math.min(max(), Math.max(0, target + dy));
      if (!running) {
        running = true;
        doc.style.scrollBehavior = "auto";
        raf = requestAnimationFrame(step);
      }
    };
    const onScroll = () => {
      if (running) {
        if (Math.abs(window.scrollY - last) > 2) {
          stop();
          sync();
        }
      } else sync();
    };
    const onKey = () => {
      if (running) {
        stop();
        sync();
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
      stop();
    };
  }, []);

  return null;
}

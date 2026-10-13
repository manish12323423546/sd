"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Lenis from "lenis";
import { bindTree, startEngine } from "@/lib/ix-engine";
import { bindWidgets, markCurrentLinks } from "@/lib/widgets";
import { applyLang, bindLangToggles, getLang, translate } from "@/lib/i18n";

/** Bind widgets and interactions inside a subtree. Safe to call repeatedly. */
export function scanAll(root: ParentNode = document.body) {
  startEngine();
  document.documentElement.classList.add("w-mod-ix");
  bindWidgets(root);
  bindTree(root);
  // Pages are generated in Gujarati; swap known strings (including notes the widgets just added) to the remembered language.
  applyLang(root === document.body ? document : root, getLang());
  bindLangToggles(root);
}

/** Client-side behaviour for the static markup: interactions, widgets, smooth scroll, demo toasts. */
export default function SiteRuntime() {
  const pathname = usePathname();
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);

  useEffect(() => {
    // Initial binding happens from <PageReady/> inside each page, after that page has hydrated.
    const scan = (root: ParentNode) => scanAll(root);
    let pending: Set<Element> | null = null;
    const mo = new MutationObserver((records) => {
      if (!pending) { pending = new Set(); queueMicrotask(() => { const set = pending!; pending = null; set.forEach((el) => { if (el.isConnected) scan(el); }); }); }
      for (const r of records) r.addedNodes.forEach((n) => { if (n.nodeType === 1) pending!.add(n as Element); });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    // React re-renders <title> (Gujarati) after hydration and on navigation; keep it in the chosen language.
    const headMo = new MutationObserver(() => { const t = translate(document.title, getLang()); if (t !== document.title) document.title = t; });
    headMo.observe(document.head, { childList: true, subtree: true, characterData: true });

    const onToast = (e: Event) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, text: (e as CustomEvent<string>).detail }]);
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
    };
    window.addEventListener("demo-toast", onToast);

    // Lenis smooth scroll on tablet/desktop only, as on the original site.
    let lenis: Lenis | null = null;
    let raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (window.matchMedia("(min-width: 768px)").matches && !reduced) {
      lenis = new Lenis({ duration: 0.8, easing: (t: number) => 1 - Math.pow(1 - t, 3), smoothWheel: true });
      lenis.on("scroll", () => window.dispatchEvent(new Event("lenis-scroll")));
      const loop = (time: number) => { lenis!.raf(time); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    }
    return () => { mo.disconnect(); headMo.disconnect(); window.removeEventListener("demo-toast", onToast); if (lenis) { cancelAnimationFrame(raf); lenis.destroy(); } };
  }, []);

  useEffect(() => {
    markCurrentLinks(pathname);
    // after a client navigation the new tree is bound by the MutationObserver; make sure scroll-linked state refreshes
    window.dispatchEvent(new Event("lenis-scroll"));
  }, [pathname]);

  return (
    <div className="demo-toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} className="demo-toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.25 }}>
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

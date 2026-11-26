"use client";
import * as React from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reveals elements marked with `data-reveal` as they scroll into view.
 * Elements already on screen are marked visible before anything is hidden,
 * so there is no flash and the first paint (and LCP) is unaffected.
 */
export function ScrollReveal() {
  const pathname = usePathname();
  React.useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pending = new Set<Element>();
    const inView = (el: Element) => {
      const r = el.getBoundingClientRect();
      // Sections with `content-visibility: auto` report an empty box until they render.
      return r.height > 0 && r.top < window.innerHeight * 0.95 && r.bottom > 0 && r.right > 0 && r.left < window.innerWidth;
    };
    const show = (el: Element) => {
      el.classList.add("is-visible");
      pending.delete(el);
      io?.unobserve(el);
    };
    const io =
      "IntersectionObserver" in window
        ? new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && show(e.target)), { rootMargin: "0px 0px -5% 0px", threshold: 0.05 })
        : null;
    const watch = (el: Element) => {
      if (el.classList.contains("is-visible") || pending.has(el)) return;
      if (inView(el)) return el.classList.add("is-visible");
      pending.add(el);
      io?.observe(el);
    };
    // Backup for lazily rendered sections and carousels: check positions once per frame while scrolling.
    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => pending.forEach((el) => inView(el) && show(el)));
    };
    document.querySelectorAll("[data-reveal]").forEach(watch);
    root.classList.add("bs-reveal-ready");
    window.addEventListener("scroll", check, { passive: true });
    document.addEventListener("scroll", check, { passive: true, capture: true }); // horizontal carousels
    window.addEventListener("resize", check);
    // A lazy section just started rendering: its cards can now be measured.
    const onCv = () => check();
    document.addEventListener("contentvisibilityautostatechange", onCv, true);
    // Cards added later (filters, "load more", client navigation) are picked up too.
    const mo = new MutationObserver((muts) => {
      for (const m of muts)
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.hasAttribute("data-reveal")) watch(n);
          n.querySelectorAll?.("[data-reveal]").forEach(watch);
        });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", check);
      document.removeEventListener("scroll", check, true);
      window.removeEventListener("resize", check);
      document.removeEventListener("contentvisibilityautostatechange", onCv, true);
    };
  }, [pathname]);
  return null;
}

/** Round "back to top" button, shown after the visitor has scrolled down a while. */
export function BackToTop({ label }: { label: string }) {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setShow(window.scrollY > 900));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      tabIndex={show ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-4 z-40 grid size-11 cursor-pointer place-items-center rounded-full bg-navy-900 text-white shadow-pop transition-[opacity,transform] duration-300 hover:-translate-y-0.5 hover:bg-red-500 md:bottom-6 print:hidden",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp className="size-5" aria-hidden />
    </button>
  );
}

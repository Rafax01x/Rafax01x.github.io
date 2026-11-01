"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { projects, type Project } from "@/lib/data";
import { EASE_OUT_EXPO } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

const filters = ["All", "Web", "Tools", "Android"] as const;
type Filter = (typeof filters)[number];

/**
 * Projects: filter chips with layout animation, horizontal pinned scroll on
 * desktop (GSAP ScrollTrigger), vertical stack on mobile, shared-layout modal.
 */
export function Projects() {
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("All");
  const [selected, setSelected] = useState<Project | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const visible = filter === "All" ? projects : projects.filter((p) => p.category === filter);

  // Modal a11y: Escape to close, focus trap, return focus, scroll lock.
  useEffect(() => {
    if (!selected) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => closeRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        return;
      }
      if (e.key !== "Tab" || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus();
    };
  }, [selected]);

  useEffect(() => {
    if (reduce) return;
    if (!sectionRef.current || !trackRef.current) return;
    if (visible.length === 0) return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    const track = trackRef.current;
    const getScroll = () => Math.max(0, track.scrollWidth - window.innerWidth + 96);
    const tween = gsap.to(track, {
      x: () => -getScroll(),
      ease: "none",
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: () => `+=${getScroll()}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      ScrollTrigger.refresh();
    };
  }, [reduce, filter, visible.length]);

  return (
    <section id="projects" ref={sectionRef} className="relative overflow-hidden py-24" aria-label="Projects">
      <div className="px-5 sm:px-8 lg:px-12">
        <p className="font-mono text-xs tracking-[0.3em] text-white/70 uppercase">02 — Selected work</p>
        <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">Work that shipped.</h2>
        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter projects">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-full px-5 py-2 text-sm font-medium transition hover:scale-[1.05] active:scale-[0.97] ${
                filter === f ? "bg-white text-black" : "border border-white/15 text-white/70"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 px-5 sm:px-8 lg:px-12">
        {visible.length === 0 ? (
          <p className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-white/70">
            No projects in this category yet. Try another filter.
          </p>
        ) : null}
        <motion.div ref={trackRef} layout className="flex flex-col gap-4 lg:w-max lg:flex-row">
          <AnimatePresence mode="popLayout">
            {visible.map((p) => (
              <motion.article
                key={p.id}
                layout
                layoutId={`project-${p.id}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                data-cursor="view"
                role="button"
                tabIndex={0}
                aria-label={`Open details for ${p.title}`}
                onClick={() => setSelected(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(p);
                  }
                }}
                style={{ visibility: selected?.id === p.id ? "hidden" : "visible" }}
                className="group w-full cursor-pointer rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-left transition-shadow hover:shadow-[0_20px_60px_rgba(6,182,212,0.25)] lg:w-[420px] lg:shrink-0"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-white/70">{p.category} · {p.year}</span>
                  <span className="text-white/70 transition group-hover:text-white">↗</span>
                </div>
                <h3 className="mt-4 text-2xl font-bold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{p.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.stack.map((s) => (
                    <span key={s} className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70">{s}</span>
                  ))}
                </div>
                <div className="mt-5 h-32 overflow-hidden rounded-2xl bg-gradient-to-br from-[#7C3AED]/60 via-[#06B6D4]/40 to-[#A3E635]/30 transition-transform duration-500 group-hover:scale-[1.02]" aria-hidden />
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-[96] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.title} details`}
          >
            <motion.div
              ref={modalRef}
              layoutId={`project-${selected.id}`}
              transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
              className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#12121A] p-7"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-2xl font-bold">{selected.title}</h3>
                <button ref={closeRef} onClick={() => setSelected(null)} aria-label="Close details" className="rounded-full border border-white/15 px-3 py-1 text-sm hover:scale-[1.05] active:scale-[0.97]">✕</button>
              </div>
              <p className="mt-3 leading-relaxed text-white/70">{selected.detail}</p>
              <a
                href={selected.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:scale-[1.05] active:scale-[0.97]"
              >
                {selected.linkLabel} →
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

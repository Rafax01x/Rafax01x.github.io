"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { TextReveal } from "@/components/ui/TextReveal";
import { stats } from "@/lib/data";
import { cardStagger, cardItem } from "@/components/animations/variants";
import type { MouseEvent } from "react";

/** Animated counter: rolls up when in view. */
function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1200);
      setN(Math.round(p * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);
  return (
    <span ref={ref} className="tabular-nums">
      {n}
      {suffix}
    </span>
  );
}

/** Tilt card: 3D tilt on fine pointers only, flat on mobile. */
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const [t, setT] = useState({ rx: 0, ry: 0 });
  function onMove(e: MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    setT({
      rx: ((e.clientY - r.top) / r.height - 0.5) * -8,
      ry: ((e.clientX - r.left) / r.width - 0.5) * 10,
    });
  }
  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={() => setT({ rx: 0, ry: 0 })}
      animate={{ rotateX: t.rx, rotateY: t.ry }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      style={{ transformPerspective: 800 }}
      className={`rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition-shadow hover:shadow-[0_20px_60px_rgba(124,58,237,0.25)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function About() {
  return (
    <section id="about" className="relative px-5 py-24 sm:px-8 lg:px-12" aria-label="About">
      <p className="font-mono text-xs tracking-[0.3em] text-white/70 uppercase">01: About</p>
      <TextReveal
        className="mt-5 max-w-3xl text-2xl leading-snug font-medium text-white/90 sm:text-4xl"
        text="A builder first. I judge work the same way I ship it: does it feel fast, clear, and finished on a real phone, in a real day?"
      />
      <motion.div
        variants={cardStagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={cardItem} className="lg:col-span-2">
          <TiltCard className="h-full">
            <h3 className="text-lg font-semibold">From idea to shipped</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Research, then a plan you approve, then build, test, review, and verify.
              No half-finished demos passed off as products.
            </p>
          </TiltCard>
        </motion.div>
        <motion.div variants={cardItem}>
          <TiltCard className="h-full">
            <h3 className="text-lg font-semibold">Motion with a purpose</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Animation should explain, guide, and delight, never slow the work down.
            </p>
          </TiltCard>
        </motion.div>
        <motion.div variants={cardItem}>
          <TiltCard className="h-full">
            <h3 className="text-lg font-semibold">Mobile is the test</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              If it is not fast and clear on a phone, it is not done.
            </p>
          </TiltCard>
        </motion.div>
      </motion.div>

      <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-4xl font-bold">
              <Counter value={s.value} suffix={s.suffix} />
            </div>
            <p className="mt-1 text-sm text-white/70">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

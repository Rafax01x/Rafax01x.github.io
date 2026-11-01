"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Marquee } from "@/components/ui/Marquee";
import { skills } from "@/lib/data";

const bars = [
  { name: "Next.js / React / TypeScript", level: 92 },
  { name: "Motion — Framer Motion / GSAP", level: 88 },
  { name: "React Native / Expo", level: 90 },
  { name: "Tailwind / Design systems", level: 94 },
];

/** Skills: infinite marquee (two tracks), hover glow, clip-path bar reveals. */
export function Skills() {
  const reduce = useReducedMotion();
  return (
    <section id="skills" className="relative py-24" aria-label="Skills">
      <div className="px-5 sm:px-8 lg:px-12">
        <p className="font-mono text-xs tracking-[0.3em] text-white/70 uppercase">03 — Stack</p>
        <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">Tools I reach for first.</h2>
      </div>
      <div className="mt-10 space-y-3">
        <Marquee items={skills} />
        <Marquee items={[...skills].reverse()} reverse />
      </div>
      <div className="mt-12 space-y-5 px-5 sm:px-8 lg:px-12">
        {bars.map((b) => (
          <div key={b.name}>
            <div className="flex justify-between text-sm">
              <span className="font-medium">{b.name}</span>
              <span className="font-mono text-white/70">{b.level}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={reduce ? { width: `${b.level}%` } : { clipPath: "inset(0 100% 0 0)" }}
                whileInView={reduce ? undefined : { clipPath: "inset(0 0% 0 0)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 1, ease: [0.83, 0, 0.17, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] via-[#06B6D4] to-[#A3E635]"
                style={{ width: `${b.level}%` }}
              />
            </div>
          </div>
        ))}
        <p className="text-sm text-white/70">
          Percentages are a self-assessment, not a benchmark — the projects above are the real proof.
        </p>
      </div>
    </section>
  );
}

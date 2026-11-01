"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MagneticButton } from "@/components/ui/MagneticButton";

/** Contact / footer: giant per-letter hover wave, magnetic email, underline-draw links. */
export function Contact() {
  const [hovered, setHovered] = useState<number | null>(null);
  const text = "Let's Talk";
  return (
    <footer id="contact" className="relative overflow-hidden px-5 py-28 sm:px-8 lg:px-12" aria-label="Contact">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_circle_at_50%_100%,rgba(124,58,237,0.25),transparent_70%)]" />
      <p className="relative font-mono text-xs tracking-[0.3em] text-white/70 uppercase">04 — Contact</p>
      <h2 className="relative mt-6 flex flex-wrap overflow-hidden font-[Clash_Display] text-[clamp(3.5rem,14vw,10rem)] leading-none font-bold tracking-tight" aria-label="Let's Talk">
        {text.split("").map((ch, i) => (
          <motion.span
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            animate={{
              color: hovered !== null && Math.abs(hovered - i) <= 1 ? "#A3E635" : "#FAFAFA",
              y: hovered === i ? -8 : 0,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="inline-block"
          >
            {ch === " " ? "\u00A0" : ch}
          </motion.span>
        ))}
      </h2>
      <p className="relative mt-5 max-w-lg leading-relaxed text-white/60">
        Have a product to build, a landing page to make premium, or an app that
        needs to actually ship? Tell me the idea — I will tell you honestly what
        it takes, then build it.
      </p>
      <div className="relative mt-9 flex flex-wrap items-center gap-4">
        <MagneticButton>
          <a href="mailto:Rafarezel08@gmail.com" className="inline-flex items-center rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black">
            Rafarezel08@gmail.com
          </a>
        </MagneticButton>
        <a href="https://github.com/Rafax01x" target="_blank" rel="noopener noreferrer" className="group relative text-sm font-medium text-white/80">
          GitHub — Rafax01x
          <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] transition-transform duration-300 group-hover:scale-x-100" />
        </a>
        <a href="https://www.threads.com/@rafa0x1" target="_blank" rel="noopener noreferrer" className="group relative text-sm font-medium text-white/80">
          Threads — @rafa0x1
          <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] transition-transform duration-300 group-hover:scale-x-100" />
        </a>
      </div>
      <div className="relative mt-20 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/70">
        <span>© {new Date().getFullYear()} rafax01. Built with Next.js, Framer Motion, and GSAP.</span>
        <span className="font-mono">Jakarta · Web × Android</span>
      </div>
    </footer>
  );
}

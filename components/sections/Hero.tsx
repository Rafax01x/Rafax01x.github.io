"use client";

import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import type { MouseEvent } from "react";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { EASE_OUT_EXPO } from "@/lib/motion";

/** Hero: clip-path char reveal, mouse parallax tilt, animated gradient mesh, scroll cue. */
export function Hero({ start = true }: { start?: boolean }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 120, damping: 18 });

  function onMove(e: MouseEvent<HTMLElement>) {
    if (reduce) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <section
      id="top"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 pt-24 pb-16 sm:px-8 lg:px-12"
      aria-label="Hero"
    >
      {/* Animated gradient mesh + particles, transform/opacity only */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-float-slow absolute -top-32 left-[8%] h-[420px] w-[420px] rounded-full bg-[#7C3AED]/40 blur-[110px]" />
        <div className="animate-float-slow absolute top-[30%] right-[4%] h-[360px] w-[360px] rounded-full bg-[#06B6D4]/30 blur-[110px] [animation-delay:-2s]" />
        <div className="animate-float-slow absolute bottom-[-10%] left-[35%] h-[320px] w-[320px] rounded-full bg-[#A3E635]/20 blur-[110px] [animation-delay:-4s]" />
      </div>

      <motion.div style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 900 }} className="relative">
        <p className="font-mono text-xs tracking-[0.3em] text-white/70 uppercase">
          Creative Developer, Web × Android
        </p>
        <h1 className="mt-5 font-[Clash_Display] text-[clamp(2.75rem,10vw,7rem)] leading-[0.9] font-bold tracking-tight" aria-label="rafax01">
          <span className="flex overflow-hidden" aria-hidden>
            {"rafax01".split("").map((ch, i) => (
              <motion.span
                key={i}
                initial={{ y: "110%" }}
                animate={start ? { y: 0 } : { y: "110%" }}
                transition={{ duration: 0.9, ease: EASE_OUT_EXPO, delay: 0.2 + i * 0.05 }}
                className="inline-block bg-gradient-to-r from-[#7C3AED] via-[#06B6D4] to-[#A3E635] bg-clip-text text-transparent"
              >
                {ch}
              </motion.span>
            ))}
          </span>
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={start ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay: 0.7 }}
          className="mt-6 max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl"
        >
          I build finished products, not just pages. Landing pages that load fast,
          tools people actually use, and Android apps that survive a real workday.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={start ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay: 0.85 }}
          className="mt-9 flex flex-wrap items-center gap-4"
        >
          <MagneticButton>
            <a href="#projects" className="inline-flex items-center rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black">
              See selected work
            </a>
          </MagneticButton>
          <MagneticButton>
            <a href="#contact" className="inline-flex items-center rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold text-white">
              Let&apos;s talk
            </a>
          </MagneticButton>
          <span className="font-mono text-xs text-white/70">Based in Jakarta · Works worldwide</span>
        </motion.div>
      </motion.div>

      <div className="relative mt-16 flex items-center gap-3 text-white/70" aria-hidden>
        <span className="font-mono text-xs tracking-widest uppercase">Scroll</span>
        <span className="animate-bounce-soft inline-block">↓</span>
      </div>
    </section>
  );
}

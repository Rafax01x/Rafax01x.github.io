"use client";

import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import type { ReactNode, MouseEvent } from "react";

/** Magnetic wrapper: element follows the cursor, damped. Disabled on touch / reduced motion. */
export function MagneticButton({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 20, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 180, damping: 20, mass: 0.4 });

  function onMove(e: MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.3);
    y.set((e.clientY - r.top - r.height / 2) * 0.3);
  }
  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy, willChange: "transform" }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
}

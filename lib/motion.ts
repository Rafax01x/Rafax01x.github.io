import type { Variants } from "framer-motion";

/** Shared custom easing from the spec: [0.83, 0, 0.17, 1] */
export const EASE_OUT_EXPO: [number, number, number, number] = [0.83, 0, 0.17, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_OUT_EXPO, delay: i * 0.08 },
  }),
};

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

export const buttonMotion = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.97 },
  transition: { type: "spring" as const, stiffness: 400, damping: 22 },
};

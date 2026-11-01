import type { Variants } from "framer-motion";
import { EASE_OUT_EXPO } from "@/lib/motion";

export const sectionFade: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT_EXPO } },
};

export const cardStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export const cardItem: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE_OUT_EXPO } },
};

"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

type State = "default" | "pointer" | "text" | "view";

/** Dot + trailing circle cursor. Fine pointers only; native cursor restored on touch. */
export function Cursor() {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<State>("default");
  const [visible, setVisible] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 250, damping: 24 });
  const ringY = useSpring(y, { stiffness: 250, damping: 24 });

  useEffect(() => {
    if (reduce) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);
    document.documentElement.classList.add("has-custom-cursor");
    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      const t = e.target as HTMLElement | null;
      const tagged = t?.closest?.("[data-cursor]")?.getAttribute("data-cursor") as State | null;
      if (tagged) setState(tagged);
      else if (t?.closest?.("a, button")) setState("pointer");
      else if (t?.closest?.("p, h1, h2, h3, span")) setState("text");
      else setState("default");
    };
    const leave = () => setVisible(false);
    window.addEventListener("mousemove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("mousemove", move);
      document.documentElement.removeEventListener("mouseleave", leave);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [reduce, x, y]);

  if (!enabled) return null;
  const ringSize = state === "view" ? 72 : state === "pointer" ? 48 : 36;
  // Single transform path per element: the outer motion.div carries x/y,
  // the inner plain div is centred with its own CSS translate(-50%,-50%).
  // Previously x/y and translateX/Y were set on the same element and could collapse.
  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[100]"
        style={{ x, y, opacity: visible ? 1 : 0 }}
      >
        <div className="h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white mix-blend-difference" />
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[100]"
        style={{ x: ringX, y: ringY, opacity: visible ? 1 : 0 }}
        animate={{ width: ringSize, height: ringSize }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        <div className="flex h-full w-full -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 mix-blend-difference">
          {state === "view" && <span className="text-[10px] font-bold tracking-widest text-white">VIEW</span>}
        </div>
      </motion.div>
    </>
  );
}

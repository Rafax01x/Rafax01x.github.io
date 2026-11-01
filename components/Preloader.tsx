"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EASE_OUT_EXPO } from "@/lib/motion";

function hasSeenIntro(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("rafax01-intro") === "1";
  } catch {
    return false;
  }
}

/**
 * Intro preloader, max ~2.5s, once per session (sessionStorage).
 * Counter 0 -> 100, "rafax01" split per letter, curtain slides up.
 * Fixes from review:
 * - sessionStorage access is guarded (a throw can no longer leave the page blank)
 * - second visit: show starts false, so no curtain exit animation plays
 * - onDone fires on exit complete, so the hero reveal starts as the curtain lifts,
 *   not while it is still covering the screen
 * - the completion timeout is cleared on unmount
 */
export function Preloader({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(0);
  const [show, setShow] = useState(() => !hasSeenIntro());
  const timeoutRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    if (!show) {
      finish();
      return;
    }
    if (reduce) {
      setShow(false);
      return;
    }
    const start = performance.now();
    const duration = 1800;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setCount(Math.round(p * 100));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        timeoutRef.current = window.setTimeout(() => {
          try {
            sessionStorage.setItem("rafax01-intro", "1");
          } catch {
            /* private mode: intro just replays next session */
          }
          setShow(false);
        }, 250);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, show]);

  return (
    <AnimatePresence onExitComplete={finish}>
      {show && (
        <motion.div
          className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-[#0A0A0F]"
          exit={{ y: "-100%" }}
          transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
          aria-label="Loading rafax01"
        >
          <div className="flex overflow-hidden" aria-hidden>
            {"rafax01".split("").map((ch, i) => (
              <motion.span
                key={i}
                initial={{ y: "110%", filter: "blur(8px)", opacity: 0 }}
                animate={{ y: 0, filter: "blur(0px)", opacity: 1 }}
                transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.15 + i * 0.06 }}
                className="font-[Clash_Display] text-5xl font-bold tracking-tight sm:text-7xl"
              >
                {ch}
              </motion.span>
            ))}
          </div>
          <div className="mt-6 font-mono text-sm text-white/70 tabular-nums">{count}%</div>
          <div className="mt-3 h-px w-48 overflow-hidden bg-white/10">
            <div className="h-full bg-gradient-to-r from-[#7C3AED] via-[#06B6D4] to-[#A3E635]" style={{ width: `${count}%` }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

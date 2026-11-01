"use client";

import { useReducedMotion } from "framer-motion";

/** Infinite marquee, double track. Paused for reduced motion. */
export function Marquee({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  const reduce = useReducedMotion();
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden" aria-label={items.join(", ")}>
      <div
        className={`flex w-max gap-3 py-1 ${reduce ? "" : reverse ? "animate-marquee-right" : "animate-marquee-left"}`}
      >
        {row.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="group whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:rotate-2 hover:border-violet-400/60 hover:text-white hover:shadow-[0_0_24px_rgba(124,58,237,0.45)]"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

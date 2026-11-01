"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitType from "split-type";

gsap.registerPlugin(ScrollTrigger);

/** Scroll word reveal: SplitType splits words, GSAP staggers them 0.03 on entry. */
export function TextReveal({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const split = new SplitType(ref.current, { types: "words" });
    const ctx = gsap.context(() => {
      gsap.from(split.words, {
        opacity: 0,
        y: 24,
        duration: 0.7,
        stagger: 0.03,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 85%" },
      });
    });
    return () => {
      ctx.revert();
      split.revert();
    };
  }, []);

  return (
    <p ref={ref} className={className}>
      {text}
    </p>
  );
}

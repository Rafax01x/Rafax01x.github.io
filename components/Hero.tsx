"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

/*
 * rafax01 — Bold Editorial hero, Indonesian UI. No 3D, no snake, no canvas.
 * Style language (black / cream / neon green, huge stacked uppercase
 * type, thin editorial dividers, numbered disciplines) is inspired by
 * the editorial portfolio reference the user shared. All content is
 * rafax01's own. Title sits on a cream block with letters alternating
 * black / neon green, per the user's pick.
 */

const DISCIPLINES = [
  { no: "01", title: "Web", desc: "Website yang jadi, walau CSS-nya sempat ngambek seharian." },
  { no: "02", title: "Apps", desc: "Aplikasi Android yang sudah lolos tes 'coba di HP gw dulu'." },
  { no: "03", title: "Motion", desc: "Animasi yang bikin user senyum, bukan malah nanya 'kok lemot?'." },
];

// Title letters, alternating cream / neon green on the black hero
// (cream block removed; black letters would be invisible on black).
const TITLE_LINES: { ch: string; green: boolean }[][] = [
  [
    { ch: "R", green: false },
    { ch: "A", green: true },
    { ch: "F", green: false },
    { ch: "A", green: true },
    { ch: "X", green: false },
  ],
  [
    { ch: "0", green: true },
    { ch: "1", green: false },
  ],
];

// Neon pixel scatter: small squares, some neon green, over black.
// Decorative only — no photo, no copied artwork.
const PIXELS = [
  [0, 0], [1, 0], [3, 0], [5, 0],
  [1, 1], [2, 1], [4, 1],
  [0, 2], [3, 2], [5, 2],
  [2, 3], [4, 3],
  [1, 4], [3, 4], [5, 4],
];

export default function Hero() {
  const rootRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      // Title letters stagger in, one by one.
      gsap.fromTo(
        ".title-letter",
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.06, ease: "power3.out" },
      );
      gsap.fromTo(
        subRef.current,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.4, ease: "power3.out" },
      );
      // Disciplines pop in hard: alternating sides, tilt, overshoot.
      gsap.utils.toArray<HTMLElement>(".discipline-card").forEach((card, i) => {
        const fromLeft = i % 2 === 0;
        gsap.fromTo(
          card,
          { x: fromLeft ? -80 : 80, y: 50, rotation: fromLeft ? -2 : 2, scale: 0.94, opacity: 0 },
          {
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            opacity: 1,
            duration: 1.0,
            delay: i * 0.15,
            ease: "back.out(1.5)",
            scrollTrigger: { trigger: card, start: "top 88%", once: true },
          },
        );
      });
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      aria-label="rafax01 hero"
      className="relative w-full bg-[#0A0A09] text-[#E6E6DF]"
      style={{ fontFamily: "Inter, -apple-system, sans-serif" }}
    >
      {/* Minimal top nav */}
      <header className="liquid-glass mx-auto mt-4 flex w-full max-w-6xl items-center justify-between rounded-full px-5 py-1 sm:px-6 xl:max-w-7xl">
        <span className="py-2 text-sm font-bold tracking-tight">rafax01</span>
        <nav className="flex items-center gap-4 font-mono text-[11px] tracking-[0.25em] sm:gap-6">
          <a href="#projects" className="py-2 hover:text-[#94EB17]">KARYA</a>
          <a href="https://github.com/Rafax01x" target="_blank" rel="noreferrer" className="py-2 hover:text-[#94EB17]">GITHUB ↗</a>
        </nav>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-6 md:pt-16 xl:max-w-7xl">
        {/* Small label */}
        <p className="font-mono text-[11px] tracking-[0.3em] text-[#E6E6DF]/70">
          <span className="mr-2 inline-block h-2 w-2 bg-[#94EB17]" aria-hidden="true" />
          MEMBANGUN WEB &amp; APLIKASI
        </p>

        {/* Stacked huge title, slightly smaller for phones, letters alternating cream / green */}
        <h1
          ref={titleRef}
          className="mt-6 font-bold uppercase leading-[0.85] tracking-[-0.03em]"
          style={{
            fontFamily: '"Clash Display", -apple-system, sans-serif',
            fontSize: "clamp(3rem, 14vw, 13rem)",
          }}
        >
          {TITLE_LINES.map((line, li) => (
            <span key={li} className="block">
              {line.map((letter, i) => (
                <span
                  key={i}
                  className={`title-letter inline-block ${letter.green ? "text-[#94EB17]" : "text-[#E6E6DF]"}`}
                >
                  {letter.ch}
                </span>
              ))}
            </span>
          ))}
        </h1>

        <div ref={subRef}>
          {/* Pills */}
          <div className="mt-8 flex flex-wrap gap-2">
            {["kreatif", "developer", "portofolio"].map((pill) => (
              <span
                key={pill}
                className="liquid-glass rounded-full px-4 py-1 text-sm"
              >
                {pill}
              </span>
            ))}
          </div>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#E6E6DF]/80 sm:text-lg">
            Bukan dev pro, cuma anak yang suka bangun sesuatu sampai jadi.
            Ini buktinya di GitHub.
          </p>

          {/* Pixel scatter block */}
          <div
            aria-hidden="true"
            className="relative mt-10 h-24 w-full max-w-md overflow-hidden border border-[#E6E6DF]/15 bg-black"
          >
            <div className="grid h-full w-full grid-cols-6 grid-rows-5">
              {Array.from({ length: 30 }).map((_, i) => {
                const col = i % 6;
                const row = Math.floor(i / 6);
                const on = PIXELS.some(([c, r]) => c === col && r === row);
                return (
                  <span
                    key={i}
                    style={on ? { animationDelay: `${(i % 5) * 0.3}s` } : undefined}
                    className={on ? "pixel-pulse bg-[#94EB17]" : "bg-transparent"}
                  />
                );
              })}
            </div>
          </div>

          {/* Thin editorial divider + numbered disciplines */}
          <div className="mt-14 border-t border-[#E6E6DF]/20 pt-8">
            <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
              {DISCIPLINES.map((d) => (
                <div key={d.no} className="discipline-card border-t border-[#E6E6DF]/20 pt-4">
                  <p className="font-mono text-xs tracking-[0.3em] text-[#94EB17]">{d.no}</p>
                  <h2 className="mt-2 text-xl font-bold uppercase tracking-tight sm:text-2xl">{d.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#E6E6DF]/70">{d.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-12 font-mono text-[10px] tracking-[0.3em] text-[#E6E6DF]/50">
            GULIR KE BAWAH <span className="scroll-bounce">↓</span>
          </p>
        </div>
      </div>
    </section>
  );
}

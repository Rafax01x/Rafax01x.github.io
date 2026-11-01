"use client";

import { useState, type MouseEvent } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { Preloader } from "@/components/Preloader";
import { Cursor } from "@/components/ui/Cursor";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Projects } from "@/components/sections/Projects";
import { Skills } from "@/components/sections/Skills";
import { Contact } from "@/components/sections/Contact";
import { useLenis } from "@/lib/useLenis";
import { scrollToSection } from "@/lib/scroll";

/**
 * rafax01 portfolio, single page.
 * React Three Fiber is intentionally not included: it is optional in the spec,
 * and the animated gradient mesh already carries the hero visual at a
 * much lower bundle and GPU cost. That keeps the Lighthouse target realistic.
 *
 * No `invisible` wrapper anymore (review fix): the preloader overlay already
 * covers the screen, and Hero animations are gated on `ready` instead, so a
 * preloader failure can never leave the whole page blank.
 */
export default function Home() {
  const [ready, setReady] = useState(false);
  useLenis();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });

  function onNavClick(e: MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    scrollToSection(href);
  }

  return (
    <main className="relative min-h-screen bg-[#0A0A0F] text-[#FAFAFA]">
      <Preloader onDone={() => setReady(true)} />
      <Cursor />
      {/* Top gradient progress bar */}
      <motion.div
        aria-hidden
        className="fixed inset-x-0 top-0 z-[91] h-[3px] origin-left bg-gradient-to-r from-[#7C3AED] via-[#06B6D4] to-[#A3E635]"
        style={{ scaleX: progress }}
      />

      {/* Floating nav */}
      <header className="fixed inset-x-0 top-4 z-[92] flex justify-center px-4">
        <nav
          aria-label="Sections"
          className="flex items-center gap-1 rounded-full border border-white/10 bg-black/50 px-2 py-1.5 backdrop-blur-md"
        >
          <a href="#top" onClick={(e) => onNavClick(e, "#top")} className="rounded-full px-4 py-1.5 text-sm font-bold">rafax01</a>
          {[
            ["#about", "About"],
            ["#projects", "Work"],
            ["#skills", "Stack"],
            ["#contact", "Contact"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={(e) => onNavClick(e, href)}
              className="rounded-full px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <Hero start={ready} />
      <About />
      <Projects />
      <Skills />
      <Contact />
    </main>
  );
}

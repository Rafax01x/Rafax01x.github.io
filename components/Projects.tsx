"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

type Project = {
  name: string;
  description: string;
  tags: string[];
  url: string;
  accent: string;
};

const PROJECTS: Project[] = [
  {
    name: "rubber-roast",
    description:
      "VS Code extension that roasts your code on save: empty catch blocks, excess console.log, and TODO/FIXME comments, with funny Indonesian and English messages.",
    tags: ["TypeScript", "VS Code extension", "Developer tools"],
    url: "https://github.com/Rafax01x/rubber-roast",
    accent: "linear-gradient(90deg, #0A0A09, #94EB17)",
  },
  {
    name: "diff-risk-classifier",
    description:
      "Portable skill that classifies the merge risk of a diff (LOW, MEDIUM, HIGH) with a verification checklist. Read-only, never modifies code.",
    tags: ["Diff review", "Risk classification", "Portable skill"],
    url: "https://github.com/Rafax01x/diff-risk-classifier",
    accent: "linear-gradient(90deg, #0A0A09, #94EB17)",
  },
  {
    name: "agentledger",
    description:
      "Git for AI agent actions: local-first audit trail and rollback CLI that records, shows, exports, and safely undoes what a coding agent changed.",
    tags: ["Go", "CLI", "Audit trail"],
    url: "https://github.com/Rafax01x/agentledger",
    accent: "linear-gradient(90deg, #0A0A09, #94EB17)",
  },
];

// Hybrid layout: first 2 projects are featured big cards, everything
// after that renders as compact rows so the page does not grow long
// as more GitHub projects are added. agentledger (project 3) is the
// first compact row.
const FEATURED = PROJECTS.slice(0, 2);
const REST = PROJECTS.slice(2);

export default function Projects() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      // Header pops up as the section scrolls into view.
      gsap.fromTo(
        ".projects-header",
        { y: 60, scale: 0.95, opacity: 0 },
        {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 1.0,
          ease: "back.out(1.2)",
          scrollTrigger: { trigger: ".projects-header", start: "top 85%", once: true },
        },
      );
      // Cards pop in hard: bigger travel, tilt, overshoot, plus accent sweep.
      gsap.utils.toArray<HTMLElement>(".project-card").forEach((card, i) => {
        const fromLeft = i % 2 === 0;
        gsap.fromTo(
          card,
          { x: fromLeft ? -120 : 120, y: 60, rotation: fromLeft ? -3 : 3, scale: 0.9, opacity: 0 },
          {
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            opacity: 1,
            duration: 1.1,
            delay: i * 0.2,
            ease: "back.out(1.5)",
            scrollTrigger: {
              trigger: card,
              start: "top 88%",
              once: true,
            },
          }
        );
        const accent = card.querySelector(".project-accent");
        if (accent) {
          gsap.fromTo(
            accent,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 0.8,
              delay: i * 0.2 + 0.3,
              ease: "power3.out",
              scrollTrigger: { trigger: card, start: "top 88%", once: true },
            },
          );
        }
      });
      // Compact rows (only present once a 3rd project exists).
      gsap.utils.toArray<HTMLElement>(".project-row").forEach((row, j) => {
        gsap.fromTo(
          row,
          { x: -32, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.7,
            delay: j * 0.08,
            ease: "power3.out",
            scrollTrigger: { trigger: row, start: "top 92%", once: true },
          },
        );
      });
    },
    { scope: rootRef }
  );

  return (
    <section
      ref={rootRef}
      id="projects"
      className="relative w-full bg-[#0A0A09] text-[#E6E6DF]"
      aria-label="Karya"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-6 sm:py-24 md:py-32 xl:max-w-7xl">
      <div className="projects-header">
      <p className="font-mono text-xs tracking-[0.3em] text-[#94EB17]">
        KARYA TERPILIH
      </p>
      <h2
        className="mt-4 text-4xl font-bold uppercase leading-[0.9] tracking-tight text-[#E6E6DF] sm:text-5xl md:text-7xl"
        style={{ fontFamily: '"Clash Display", sans-serif' }}
      >
        Karya<br />Terpilih
      </h2>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-[#E6E6DF]/80">
        Hanya proyek yang sudah ada di GitHub.
      </p>
      </div>

      <div className="mt-12 grid gap-5 sm:gap-6 sm:grid-cols-2">
        {FEATURED.map((project) => (
          <a
            key={project.name}
            href={project.url}
            target="_blank"
            rel="noreferrer"
            className="project-card liquid-glass group block overflow-hidden rounded-xl p-5 transition-all hover:-translate-y-1 hover:shadow-xl sm:p-6 md:p-8"
          >
            <span
              aria-hidden
              className="project-accent -mx-6 -mt-6 mb-6 block h-1 origin-left md:-mx-8 md:-mt-8"
              style={{ background: project.accent }}
            />
            <div className="flex items-start justify-between gap-4">
              <h3
                className="text-2xl font-bold text-[#E6E6DF]"
                style={{ fontFamily: '"Clash Display", sans-serif' }}
              >
                {project.name}
              </h3>
              <span aria-hidden className="text-lg text-[#E6E6DF]/70 group-hover:text-[#94EB17]">
                ↗
              </span>
            </div>
            <p className="mt-3 leading-relaxed text-[#E6E6DF]/80">{project.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#E6E6DF]/20 px-3 py-1 font-mono text-xs text-[#E6E6DF]/70"
                >
                  {tag}
                </span>
              ))}
            </div>
            <span className="mt-6 block font-mono text-xs tracking-widest text-[#E6E6DF]/50">
              2026 — GITHUB: Rafax01x / {project.name}
            </span>
          </a>
        ))}
      </div>

      {REST.length > 0 && (
        <div className="mt-14">
          <p className="font-mono text-xs tracking-[0.3em] text-[#94EB17]">
            LAINNYA
          </p>
          <div className="mt-4 border-t border-[#E6E6DF]/15">
            {REST.map((project) => (
              <a
                key={project.name}
                href={project.url}
                target="_blank"
                rel="noreferrer"
                className="project-row group flex min-h-[56px] items-center justify-between gap-4 border-b border-[#E6E6DF]/15 py-4 transition-colors hover:text-[#94EB17]"
              >
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="truncate text-base font-bold sm:text-lg">{project.name}</span>
                  <span className="font-mono text-xs text-[#E6E6DF]/60">
                    {project.tags[0]}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 text-lg text-[#E6E6DF]/70 group-hover:text-[#94EB17]">
                  ↗
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
      </div>
    </section>
  );
}

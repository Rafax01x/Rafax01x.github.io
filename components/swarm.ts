// Swarm Rebuild — full-page rebuild, original implementation.
// Concept inspired by Joel Califa's Swarm and the swarm-cursors tribute
// (a Chrome extension that wipes a page to a blank canvas and rebuilds
// it with multiplayer cursors). No code was copied from either project:
// this engine is written from scratch for this site.
//
// How it works: after the preloader finishes, the page is covered by a
// blank canvas (same background as the site) and 8 Figma-style bots
// orbit the centre, fan out, and rebuild the page top-down: each section
// gets its box drawn with a crosshair + W x H badge, then its content
// is revealed (headline typed, keyboard keys staggered, cards in
// parallel). Click, Esc, or the skip button reveals everything at once.
// Disabled on mobile (<=768px) and for prefers-reduced-motion.
// The overlay never intercepts clicks (pointer-events: none, except the
// skip button). If this script never runs, nothing is ever hidden:
// the blank/hidden state is only applied by this script at runtime.

export type SwarmCleanup = () => void;

type BotDef = { name: string; color: string };
type Bot = BotDef & {
  el: HTMLDivElement;
  x: number;
  y: number;
  tx: number;
  ty: number;
};

const BOTS: BotDef[] = [
  { name: "agent:layout", color: "#00ff9d" },
  { name: "agent:ui", color: "#38bdf8" },
  { name: "agent:type", color: "#f472b6" },
  { name: "agent:media", color: "#fbbf24" },
  { name: "agent:motion", color: "#a78bfa" },
  { name: "agent:keys", color: "#fb7185" },
  { name: "agent:copy", color: "#facc15" },
  { name: "agent:qa", color: "#e2e8f0" },
];

const GREEN = "#00ff9d";
const CYAN = "#38bdf8";

// Flock anchors inside a section rect (fractions of width/height),
// one per bot, in BOTS order.
const ANCHORS: Array<[number, number]> = [
  [0.22, 0.25],
  [0.72, 0.7],
  [0.35, 0.6],
  [0.6, 0.3],
  [0.85, 0.55],
  [0.15, 0.75],
  [0.5, 0.45],
  [0.92, 0.85],
];

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function cursorSvg(color: string): string {
  return (
    '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">' +
    `<path d="M2 1 L2 17.5 L6 13.6 L8.6 19.4 L11.2 18.2 L8.6 12.4 L14.5 12.4 Z" fill="${color}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>` +
    "</svg>"
  );
}

type JobKind = "fade" | "type" | "keys" | "stagger" | "cards";
type Job = {
  label: string;
  el: HTMLElement;
  reveal: HTMLElement[];
  kind: JobKind;
  extra?: HTMLElement[];
};

export function initSwarm(): SwarmCleanup {
  if (typeof window === "undefined") return () => {};
  if (window.matchMedia("(max-width: 768px)").matches) return () => {};
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => {};
  }
  if (document.querySelector(".swarm-layer")) return () => {};

  let cancelled = false;
  let rafId = 0;
  let orbiting = false;
  let orbitStart = 0;
  let arriveResolve: (() => void) | null = null;
  const listeners: Array<() => void> = [];

  const on = (
    target: EventTarget,
    type: string,
    fn: EventListener,
    options?: AddEventListenerOptions,
  ) => {
    target.addEventListener(type, fn, options);
    listeners.push(() => target.removeEventListener(type, fn, options));
  };

  // --- Overlay + bots -------------------------------------------------
  const layer = document.createElement("div");
  layer.className = "swarm-layer";
  layer.setAttribute("aria-hidden", "true");

  const blank = document.createElement("div");
  blank.className = "swarm-blank";
  layer.appendChild(blank);

  const frame = document.createElement("div");
  frame.className = "swarm-frame";
  const frameBadge = document.createElement("span");
  frameBadge.className = "swarm-frame-badge";
  frame.appendChild(frameBadge);
  layer.appendChild(frame);

  const frame2 = document.createElement("div");
  frame2.className = "swarm-frame";
  const frame2Badge = document.createElement("span");
  frame2Badge.className = "swarm-frame-badge";
  frame2.appendChild(frame2Badge);
  layer.appendChild(frame2);

  const statusChip = document.createElement("div");
  statusChip.className = "swarm-status";
  statusChip.style.opacity = "0";
  layer.appendChild(statusChip);

  const progress = document.createElement("div");
  progress.className = "swarm-progress";
  progress.textContent = "Membangun…";
  layer.appendChild(progress);

  const skipBtn = document.createElement("button");
  skipBtn.className = "swarm-skip";
  skipBtn.type = "button";
  skipBtn.textContent = "Lewati pembangunan ×";
  layer.appendChild(skipBtn);

  const makeBot = (def: BotDef, index: number): Bot => {
    const el = document.createElement("div");
    el.className = "swarm-cursor";
    el.dataset.bot = def.name.replace("agent:", "");
    el.innerHTML =
      cursorSvg(def.color) +
      `<span class="swarm-tag" style="background:${def.color}">${def.name}</span>`;
    layer.appendChild(el);
    const cx = window.innerWidth / 2 + (index - 3.5) * 24;
    const cy = window.innerHeight * 0.4;
    return { ...def, el, x: cx, y: cy, tx: cx, ty: cy };
  };

  const bots: Bot[] = BOTS.map(makeBot);
  document.body.appendChild(layer);

  // Raised elements (z-index above the blank canvas) and their original
  // inline position/z-index, so the finale can restore them exactly.
  const raised: Array<{ el: HTMLElement; pos: string; z: string }> = [];
  const raise = (el: HTMLElement) => {
    if (el.style.zIndex === "81") return;
    raised.push({ el, pos: el.style.position, z: el.style.zIndex });
    if (window.getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }
    el.style.zIndex = "81";
  };
  const unraiseAll = () => {
    for (const r of raised) {
      r.el.style.position = r.pos;
      r.el.style.zIndex = r.z;
    }
    raised.length = 0;
  };

  // --- Movement (one shared rAF ticker) -------------------------------
  const tick = (now: number) => {
    if (cancelled) return;
    if (orbiting) {
      const t = (now - orbitStart) / 1000;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight * 0.38;
      bots.forEach((b, i) => {
        const a = t * 1.9 + (i * Math.PI * 2) / bots.length;
        b.tx = cx + Math.cos(a) * 120;
        b.ty = cy + Math.sin(a) * 72;
      });
    }
    let allClose = true;
    for (const b of bots) {
      b.x += (b.tx - b.x) * 0.16;
      b.y += (b.ty - b.y) * 0.16;
      if (Math.abs(b.tx - b.x) > 5 || Math.abs(b.ty - b.y) > 5) {
        allClose = false;
      }
      b.el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0)`;
    }
    if (arriveResolve && allClose) {
      const resolve = arriveResolve;
      arriveResolve = null;
      resolve();
    }
    rafId = requestAnimationFrame(tick);
  };

  const moveToAll = (
    points: Array<{ x: number; y: number }>,
    timeoutMs = 1300,
  ): Promise<void> => {
    bots.forEach((b, i) => {
      const p = points[i % points.length];
      b.tx = p.x;
      b.ty = p.y;
    });
    return new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      arriveResolve = finish;
      setTimeout(finish, timeoutMs);
    });
  };

  const flockPoints = (rect: DOMRect): Array<{ x: number; y: number }> =>
    ANCHORS.map(([fx, fy]) => ({
      x: rect.left + rect.width * fx,
      y: rect.top + rect.height * fy,
    }));

  // --- Jobs ------------------------------------------------------------
  const collectJobs = (): Job[] => {
    const hero = document.getElementById("hero");
    const heroHeadline = document.getElementById("heroHeadline");
    // NOTE: the headline's own className is replaced by the font toggle,
    // so the job element is its parent column, never the h1 itself.
    const heroCol = heroHeadline?.parentElement ?? heroHeadline;
    const terminalHistory = document.getElementById("terminalHistory");
    const terminalPanel = terminalHistory?.parentElement?.parentElement;
    const cards = Array.from(
      document.querySelectorAll(".project-card"),
    ) as HTMLElement[];
    const projectsHeader = document.querySelector(
      "#projects > div",
    ) as HTMLElement | null;
    const lainnya = document.querySelector(
      "#projects .mt-12",
    ) as HTMLElement | null;
    const header = document.querySelector("header") as HTMLElement | null;
    const footer = document.querySelector("footer") as HTMLElement | null;
    const pillars = document.getElementById("pillars");
    const retro = document.getElementById("retroWindow1984");
    const keyboard = document.getElementById("threeContainer");

    const jobs: Job[] = [];
    const push = (
      label: string,
      el: HTMLElement | null | undefined,
      kind: JobKind,
      reveal?: HTMLElement[],
      extra?: HTMLElement[],
    ) => {
      if (!el) return;
      jobs.push({
        label,
        el,
        reveal: reveal ?? [el],
        kind,
        extra,
      });
    };

    // Hero header extras: top bar + stats column, revealed with the
    // headline job (they are not jobs of their own).
    const topBar = hero?.children[0] as HTMLElement | undefined;
    const statsCol = hero?.querySelector(
      '[class*="col-span-4"]',
    ) as HTMLElement | null;
    const heroExtras = [topBar, statsCol].filter(
      (e): e is HTMLElement => !!e,
    );

    push("Navigasi", header, "fade", undefined, [
      document.getElementById("scrollProgress"),
    ].filter((e): e is HTMLElement => !!e));
    push("Hero", heroCol as HTMLElement | null, "type", [
      heroCol as HTMLElement,
      ...heroExtras,
    ]);
    push("Keyboard", keyboard, "keys");
    push("Terminal", terminalPanel as HTMLElement | null, "fade");
    push("Jendela 1984", retro, "fade");
    push("Pilar", pillars, "stagger");
    if (cards.length > 0) {
      jobs.push({
        label: "Kartu proyek",
        el: cards[0],
        reveal: [...cards, ...(projectsHeader ? [projectsHeader] : [])],
        kind: "cards",
        extra: cards.slice(1),
      });
    }
    push("LAINNYA", lainnya, "fade");
    push("Footer", footer, "fade");
    return jobs;
  };

  // Headline typing state, so a skip mid-typing restores the full text.
  let headlineSpans: HTMLSpanElement[] = [];
  let headlineTexts: string[] = [];

  const restoreHeadline = () => {
    headlineSpans.forEach((span, i) => {
      span.textContent = headlineTexts[i] ?? span.textContent;
      span.style.opacity = "";
    });
  };

  const clearInlineHiding = (root: HTMLElement) => {
    root
      .querySelectorAll<HTMLElement>("[data-swarm-inline]")
      .forEach((el) => {
        el.style.opacity = "";
        el.style.transition = "";
        el.style.transitionDelay = "";
        el.removeAttribute("data-swarm-inline");
      });
  };

  const revealAll = (jobs: Job[]) => {
    restoreHeadline();
    for (const job of jobs) {
      for (const el of job.reveal) {
        el.classList.remove("swarm-hidden");
        el.classList.remove("swarm-built");
        el.style.opacity = "";
        clearInlineHiding(el);
      }
      if (job.extra) {
        for (const el of job.extra) {
          el.classList.remove("swarm-hidden");
          el.style.opacity = "";
          clearInlineHiding(el);
        }
      }
    }
    unraiseAll();
  };

  const finish = () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
    layer.style.transition = "opacity .5s ease";
    layer.style.opacity = "0";
    setTimeout(() => layer.remove(), 550);
  };

  const skip = () => {
    if (cancelled) return;
    revealAll(collectJobs());
    finish();
  };
  on(window, "pointerdown", skip);
  on(window, "keydown", ((e: Event) => {
    if ((e as KeyboardEvent).key === "Escape") skip();
  }) as EventListener);
  on(skipBtn, "click", skip);

  const waitForPreloader = async () => {
    const deadline = Date.now() + 8000;
    for (;;) {
      const pre = document.getElementById("preloader");
      if (!pre || pre.style.display === "none") return;
      if (Date.now() > deadline) return;
      await wait(120);
    }
  };

  const placeStatus = (rect: DOMRect, text: string, color: string) => {
    const y = rect.top > 48 ? rect.top - 30 : rect.bottom + 10;
    statusChip.textContent = text;
    statusChip.style.color = color;
    statusChip.style.borderColor = color;
    statusChip.style.opacity = "1";
    statusChip.style.transform = `translate3d(${Math.max(8, rect.right - 132)}px, ${Math.max(8, y)}px, 0)`;
  };
  const hideStatus = () => {
    statusChip.style.opacity = "0";
  };

  const drawFrame = async (
    frameEl: HTMLDivElement,
    badgeEl: HTMLSpanElement,
    rect: DOMRect,
    color: string,
    duration = 450,
  ) => {
    frameEl.style.borderColor = color;
    frameEl.style.transition = "none";
    frameEl.style.left = `${rect.left}px`;
    frameEl.style.top = `${rect.top}px`;
    frameEl.style.width = "0px";
    frameEl.style.height = "0px";
    frameEl.style.opacity = "1";
    badgeEl.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    void frameEl.offsetWidth; // reflow so the transition runs
    frameEl.style.transition = `left ${duration}ms ease, top ${duration}ms ease, width ${duration}ms ease, height ${duration}ms ease`;
    frameEl.style.width = `${rect.width}px`;
    frameEl.style.height = `${rect.height}px`;
    await wait(duration + 60);
  };

  const hideFrame = async (frameEl: HTMLDivElement) => {
    frameEl.style.transition = "opacity .25s ease";
    frameEl.style.opacity = "0";
    await wait(260);
  };

  const ensureVisible = async (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < 80 || rect.bottom > window.innerHeight - 30) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      await wait(650);
    }
  };

  const typeHeadline = async () => {
    const heroHeadline = document.getElementById("heroHeadline");
    if (!heroHeadline) return;
    headlineSpans = Array.from(
      heroHeadline.querySelectorAll("span"),
    ) as HTMLSpanElement[];
    headlineTexts = headlineSpans.map((s) => s.textContent ?? "");
    for (const span of headlineSpans) span.textContent = "";
    for (let i = 0; i < headlineSpans.length; i++) {
      const span = headlineSpans[i];
      const text = headlineTexts[i] ?? "";
      for (const ch of text) {
        if (cancelled) return;
        span.textContent += ch;
        await wait(26);
      }
      await wait(120);
    }
  };

  const staggerChildren = async (
    root: HTMLElement,
    selector: string,
    stepMs: number,
  ) => {
    const kids = Array.from(root.querySelectorAll(selector)) as HTMLElement[];
    kids.forEach((kid) => {
      kid.style.opacity = "0";
      kid.setAttribute("data-swarm-inline", "1");
    });
    await wait(60);
    kids.forEach((kid, i) => {
      kid.style.transition = "opacity .35s ease";
      kid.style.transitionDelay = `${i * stepMs}ms`;
      kid.style.opacity = "1";
    });
    await wait(kids.length * stepMs + 400);
    kids.forEach((kid) => {
      kid.style.opacity = "";
      kid.style.transition = "";
      kid.style.transitionDelay = "";
      kid.removeAttribute("data-swarm-inline");
    });
  };

  const runJob = async (job: Job, index: number, total: number) => {
    progress.textContent = `Membangun ${index + 1}/${total} · ${job.label}`;
    await ensureVisible(job.el);
    if (cancelled) return;
    const fresh = job.el.getBoundingClientRect();
    const points = flockPoints(fresh);
    // The layout bot drags the frame's bottom-right corner as it grows.
    const layoutPoint = {
      x: fresh.right,
      y: fresh.bottom,
    };
    const move = moveToAll(
      points.map((p, i) => (i === 0 ? layoutPoint : p)),
    );
    placeStatus(fresh, "assembling", GREEN);
    await drawFrame(frame, frameBadge, fresh, GREEN);
    if (job.kind === "cards" && job.extra?.[0]) {
      const rect2 = job.extra[0].getBoundingClientRect();
      await drawFrame(frame2, frame2Badge, rect2, CYAN);
    }
    await move;
    if (cancelled) return;

    // Reveal: raise above the blank canvas, then show. Every revealed
    // element is raised individually (its section may not be a stacking
    // context of its own, e.g. the projects header inside #projects).
    for (const el of job.reveal) {
      raise(el);
    }
    if (job.extra) {
      for (const el of job.extra) {
        raise(el);
      }
    }
    for (const el of job.reveal) {
      el.classList.remove("swarm-hidden");
      el.classList.add("swarm-built");
    }
    if (job.extra) {
      for (const el of job.extra) {
        el.classList.remove("swarm-hidden");
        el.classList.add("swarm-built");
      }
    }
    placeStatus(fresh, "rendering", CYAN);

    if (job.kind === "type") {
      await typeHeadline();
    } else if (job.kind === "keys") {
      const keys = Array.from(
        job.el.querySelectorAll(".kb-key"),
      ) as HTMLElement[];
      keys.forEach((k) => {
        k.style.opacity = "0";
        k.setAttribute("data-swarm-inline", "1");
      });
      await wait(60);
      keys.forEach((k, i) => {
        k.style.transition = "opacity .3s ease";
        k.style.transitionDelay = `${Math.min(i * 10, 450)}ms`;
        k.style.opacity = "1";
      });
      await wait(650);
      keys.forEach((k) => {
        k.style.opacity = "";
        k.style.transition = "";
        k.style.transitionDelay = "";
        k.removeAttribute("data-swarm-inline");
      });
    } else if (job.kind === "stagger") {
      const grid = job.el.querySelector(".grid");
      if (grid) {
        await staggerChildren(grid as HTMLElement, ":scope > div", 130);
      } else {
        await wait(400);
      }
    } else {
      await wait(420);
    }
    if (cancelled) return;
    await hideFrame(frame);
    if (job.kind === "cards") await hideFrame(frame2);
    hideStatus();
    await wait(120);
  };

  const run = async () => {
    await waitForPreloader();
    if (cancelled) return;
    const jobs = collectJobs();
    if (jobs.length === 0) {
      finish();
      return;
    }

    // Blank canvas: hide everything this rebuild owns, then cover the
    // page. #hero is raised now (it is a stacking context, z-10) so its
    // children can rise above the canvas when their job runs.
    const hero = document.getElementById("hero");
    if (hero) raise(hero);
    for (const job of jobs) {
      for (const el of job.reveal) {
        el.classList.add("swarm-hidden");
        el.classList.remove("reveal");
        el.querySelectorAll(".reveal").forEach((d) => {
          d.classList.remove("reveal");
          (d as HTMLElement).style.transitionDelay = "";
        });
        el.style.transitionDelay = "";
      }
      if (job.extra) {
        for (const el of job.extra) {
          el.classList.add("swarm-hidden");
          el.classList.remove("reveal");
          el.style.transitionDelay = "";
        }
      }
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    blank.style.transition = "opacity .35s ease";
    blank.style.opacity = "1";
    await wait(380);
    if (cancelled) return;

    rafId = requestAnimationFrame(tick);
    orbiting = true;
    orbitStart = performance.now();
    await wait(950);
    orbiting = false;
    if (cancelled) return;

    for (let i = 0; i < jobs.length; i++) {
      if (cancelled) return;
      await runJob(jobs[i], i, jobs.length);
    }
    if (cancelled) return;

    // Finale: bots drift down, canvas + layer fade away together.
    progress.textContent = "Selesai — selamat datang di rafax01";
    await moveToAll(
      bots.map((_, i) => ({
        x: window.innerWidth / 2 + (i - 3.5) * 56,
        y: window.innerHeight - 120,
      })),
      900,
    );
    document.documentElement.dataset.swarmDone = "true";
    unraiseAll();
    for (const job of jobs) {
      for (const el of job.reveal) el.classList.remove("swarm-built");
      if (job.extra) {
        for (const el of job.extra) el.classList.remove("swarm-built");
      }
    }
    finish();
  };

  void run();

  return () => {
    if (!cancelled) {
      revealAll(collectJobs());
    }
    cancelled = true;
    cancelAnimationFrame(rafId);
    for (const remove of listeners) remove();
    layer.remove();
  };
}

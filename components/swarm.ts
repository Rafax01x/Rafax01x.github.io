// Autonomous swarm cursors — original implementation, no dependencies.
// Concept inspired by Joel Califa's Swarm and the swarm-cursors tribute
// (a Chrome extension that rebuilds a page with multiplayer cursors).
// No code was copied from either project: this engine is written from
// scratch for this site — two Figma-style bots, translate3d + rAF only.
//
// Behaviour: after the preloader finishes, the bots visit the page's key
// sections in order (nav pill, hero headline, project cards, LAINNYA),
// mark each one blueprint (.auto-build), show a dashed neon outline with
// a status chip (assembling -> rendering), then leave it final (.built).
// Click or Esc skips the rest instantly. Disabled on mobile (<=768px)
// and for prefers-reduced-motion. The overlay never intercepts clicks:
// pointer-events is none everywhere. If JS fails, nothing is ever hidden:
// .auto-build is only added by this script at runtime.

export type SwarmCleanup = () => void;

const GREEN = "#00ff9d";
const CYAN = "#38bdf8";

type Bot = {
  el: HTMLDivElement;
  x: number;
  y: number;
  tx: number;
  ty: number;
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function cursorSvg(color: string): string {
  return (
    '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">' +
    `<path d="M2 1 L2 17.5 L6 13.6 L8.6 19.4 L11.2 18.2 L8.6 12.4 L14.5 12.4 Z" fill="${color}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>` +
    "</svg>"
  );
}

export function initSwarm(): SwarmCleanup {
  if (typeof window === "undefined") return () => {};
  // Mobile: never run (CSS hides the layer too, as a second guard).
  if (window.matchMedia("(max-width: 768px)").matches) return () => {};
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => {};
  }
  if (document.querySelector(".swarm-layer")) return () => {};

  let cancelled = false;
  let rafId = 0;
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

  const statusChip = document.createElement("div");
  statusChip.className = "swarm-status";
  statusChip.style.opacity = "0";
  layer.appendChild(statusChip);

  const makeBot = (name: string, color: string): Bot => {
    const el = document.createElement("div");
    el.className = "swarm-cursor";
    el.dataset.bot = name === "agent:layout" ? "layout" : "ui";
    el.innerHTML =
      cursorSvg(color) +
      `<span class="swarm-tag" style="background:${color}">${name}</span>`;
    layer.appendChild(el);
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.4;
    return { el, x: cx, y: cy, tx: cx, ty: cy };
  };

  const bots: Bot[] = [
    makeBot("agent:layout", GREEN),
    makeBot("agent:ui", CYAN),
  ];
  document.body.appendChild(layer);

  // --- Movement (one shared rAF ticker, lerp toward targets) ----------
  const tick = () => {
    if (cancelled) return;
    let allClose = true;
    for (const b of bots) {
      b.x += (b.tx - b.x) * 0.14;
      b.y += (b.ty - b.y) * 0.14;
      if (Math.abs(b.tx - b.x) > 4 || Math.abs(b.ty - b.y) > 4) {
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

  const moveTo = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    timeoutMs = 1300,
  ): Promise<void> => {
    bots[0].tx = p1.x;
    bots[0].ty = p1.y;
    bots[1].tx = p2.x;
    bots[1].ty = p2.y;
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

  // --- Targets ---------------------------------------------------------
  const collectTargets = (): HTMLElement[] => {
    const heroHeadline = document.getElementById("heroHeadline");
    // NOTE: the headline's own className is replaced by the font toggle,
    // so the target is its parent column, never the h1 itself.
    const hero = heroHeadline?.parentElement ?? heroHeadline;
    const found: Array<HTMLElement | null> = [
      document.querySelector("header") as HTMLElement | null,
      hero as HTMLElement | null,
      ...(Array.from(
        document.querySelectorAll(".project-card"),
      ) as HTMLElement[]),
      document.querySelector("#projects .mt-12") as HTMLElement | null,
    ];
    return found.filter((el): el is HTMLElement => el !== null);
  };

  const ensureVisible = async (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < 90 || rect.bottom > window.innerHeight - 40) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      await wait(650);
    }
  };

  const placeStatus = (el: HTMLElement, text: string, color: string) => {
    const rect = el.getBoundingClientRect();
    const y =
      rect.top > 48 ? rect.top - 30 : rect.bottom + 10;
    statusChip.textContent = text;
    statusChip.style.color = color;
    statusChip.style.borderColor = color;
    statusChip.style.opacity = "1";
    statusChip.style.transform = `translate3d(${Math.max(8, rect.right - 132)}px, ${Math.max(8, y)}px, 0)`;
  };

  const hideStatus = () => {
    statusChip.style.opacity = "0";
  };

  const buildAll = (targets: HTMLElement[]) => {
    for (const el of targets) {
      el.classList.remove("assembling", "rendering");
      el.classList.add("built");
      delete el.dataset.swarmStatus;
    }
  };

  const finish = () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
    hideStatus();
    layer.style.transition = "opacity .5s ease";
    layer.style.opacity = "0";
    setTimeout(() => layer.remove(), 550);
  };

  // Skip: click anywhere or Esc finishes everything instantly.
  const skip = () => {
    if (cancelled) return;
    buildAll(collectTargets());
    finish();
  };
  on(window, "pointerdown", skip);
  on(window, "keydown", ((e: Event) => {
    if ((e as KeyboardEvent).key === "Escape") skip();
  }) as EventListener);

  const waitForPreloader = async () => {
    const deadline = Date.now() + 8000;
    for (;;) {
      const pre = document.getElementById("preloader");
      if (!pre || pre.style.display === "none") return;
      if (Date.now() > deadline) return;
      await wait(120);
    }
  };

  const run = async () => {
    await waitForPreloader();
    if (cancelled) return;
    const targets = collectTargets();
    if (targets.length === 0) {
      finish();
      return;
    }
    // Blueprint state is applied here, at runtime only: if this script
    // never runs, the page is never hidden.
    for (const el of targets) {
      el.classList.add("auto-build");
      // Paket Ringan's reveal would fight the swarm's opacity, so the
      // swarm owns visibility for project cards from here on.
      el.classList.remove("reveal");
    }
    rafId = requestAnimationFrame(tick);

    for (const el of targets) {
      if (cancelled) return;
      await ensureVisible(el);
      if (cancelled) return;
      const rect = el.getBoundingClientRect();
      await moveTo(
        {
          x: rect.left + rect.width * 0.22,
          y: rect.top + rect.height * 0.25,
        },
        {
          x: rect.left + rect.width * 0.72,
          y: rect.top + rect.height * 0.7,
        },
      );
      if (cancelled) return;
      el.classList.add("assembling");
      el.dataset.swarmStatus = "assembling";
      placeStatus(el, "assembling", GREEN);
      await wait(550);
      if (cancelled) return;
      el.classList.remove("assembling");
      el.classList.add("rendering");
      el.dataset.swarmStatus = "rendering";
      placeStatus(el, "rendering", CYAN);
      await wait(450);
      if (cancelled) return;
      el.classList.remove("rendering");
      el.classList.add("built");
      delete el.dataset.swarmStatus;
      hideStatus();
      await wait(180);
    }

    // Finale: both bots drift down and fade out.
    if (!cancelled) {
      await moveTo(
        { x: window.innerWidth / 2 - 70, y: window.innerHeight - 130 },
        { x: window.innerWidth / 2 + 30, y: window.innerHeight - 110 },
        900,
      );
      document.documentElement.dataset.swarmDone = "true";
      finish();
    }
  };

  void run();

  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
    for (const remove of listeners) remove();
    layer.remove();
  };
}

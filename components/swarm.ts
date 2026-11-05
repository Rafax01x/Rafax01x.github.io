// Swarm Cursors v4 — autonomous 2-bot tour over the LIVE page.
// Design supplied by the user (result from another AI, delivered as
// an edited index.html) and integrated here into the Next.js source:
// the engine lives in this file, its targets are marked in
// components/NewSite.tsx (.swarm-target + data-swarm-task-*), and its
// styling lives in app/globals.css.
//
// How it differs from v3: there is NO blank canvas and NOTHING is
// hidden — the finished page stays fully visible the whole time. Two
// bots (agent:layout green, agent:core cyan) glide from section to
// section in document order, smooth-scroll each target into view,
// outline it with a dashed frame, show a task label (e.g.
// "pcb:soldering"), and on the keyboard they press SPACEBAR once.
// When the tour ends both bots park in the bottom-right corner and
// stay there. The tour never blocks the page: the overlay ignores
// pointer input, and as soon as the visitor scrolls, auto-scroll
// stops. Disabled on mobile (<=768px) and for prefers-reduced-motion.
//
// NOTE: the other AI's file had DELETED the page's original inline
// script (playable keyboard, Web Audio synth, terminal, 1984 mode).
// That script is deliberately KEPT here — this engine only adds the
// tour on top of the existing page; it removes no functionality.

export type SwarmCleanup = () => void;

type Bot = {
  name: string;
  color: string;
  el: HTMLDivElement;
  statusEl: HTMLSpanElement;
  x: number;
  y: number;
};

const BOTS: Array<{ name: string; color: string }> = [
  { name: "agent:layout", color: "#00ff9d" },
  { name: "agent:core", color: "#38bdf8" },
];

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function initSwarm(): SwarmCleanup {
  if (typeof window === "undefined") return () => {};
  if (window.matchMedia("(max-width: 768px)").matches) return () => {};
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => {};
  }
  if (document.querySelector(".swarm-layer")) return () => {};

  let cancelled = false;
  const timeouts = new Set<number>();
  const listeners: Array<() => void> = [];

  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timeouts.delete(id);
      if (!cancelled) fn();
    }, ms);
    timeouts.add(id);
    return id;
  };

  const on = (
    target: EventTarget,
    type: string,
    fn: EventListener,
    options?: AddEventListenerOptions,
  ) => {
    target.addEventListener(type, fn, options);
    listeners.push(() => target.removeEventListener(type, fn, options));
  };

  // --- Overlay + bots --------------------------------------------------
  const overlay = document.createElement("div");
  overlay.id = "swarm-overlay";
  overlay.className = "swarm-layer";
  overlay.dataset.swarmVersion = "4.0";
  overlay.setAttribute("aria-hidden", "true");

  const bots: Bot[] = BOTS.map((def) => {
    const el = document.createElement("div");
    el.className = "swarm-bot";
    el.innerHTML =
      '<svg width="20" height="24" viewBox="0 0 18 22" fill="none" aria-hidden="true">' +
      `<path d="M1 1L6.5 20.5L10.5 13.5L17 11.5L1 1Z" fill="${def.color}" stroke="#070709" stroke-width="1.6"/>` +
      "</svg>" +
      `<span class="swarm-tag" style="background:${def.color}">${def.name}</span>` +
      '<span class="swarm-status">idle</span>';
    overlay.appendChild(el);
    const statusEl = el.querySelector(".swarm-status") as HTMLSpanElement;
    const bot: Bot = { ...def, el, statusEl, x: -100, y: -100 };
    // Position immediately: until the first setBot, a fixed element
    // with no transform renders at (0,0).
    el.style.transform = "translate3d(-100px, -100px, 0)";
    return bot;
  });
  document.body.appendChild(overlay);

  const setBot = (bot: Bot, x: number, y: number, status?: string) => {
    bot.x = x;
    bot.y = y;
    bot.el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    if (status) {
      bot.statusEl.textContent = status;
      bot.statusEl.style.opacity = "1";
    } else {
      bot.statusEl.style.opacity = "0";
    }
  };

  // --- Visitor takes over ----------------------------------------------
  // Once the visitor scrolls on their own, the tour stops scrolling
  // for them (the bots keep touring the visible page).
  let userHasScrolled = false;
  const onUserGesture = () => {
    userHasScrolled = true;
  };
  on(window, "wheel", onUserGesture, { passive: true, once: true });
  on(window, "touchmove", onUserGesture, { passive: true, once: true });

  // --- Tour ------------------------------------------------------------
  let queueIndex = 0;

  const runQueue = () => {
    if (cancelled) return;
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(".swarm-target"),
    );
    if (queueIndex >= targets.length) {
      // Tour done: park both bots in the bottom-right corner, fully
      // inside the viewport. v4.0 parked at innerHeight-56, which
      // clipped the name/status pills at the bottom edge (a bot is
      // ~55px tall: svg + tag + status) and the tags ran past the
      // right edge — verified clipped on desktop 1919x998.
      setBot(bots[0], window.innerWidth - 200, window.innerHeight - 96, "sys:idle");
      setBot(bots[1], window.innerWidth - 120, window.innerHeight - 96, "synced");
      return;
    }

    const el = targets[queueIndex];
    const rectBefore = el.getBoundingClientRect();
    if (
      !userHasScrolled &&
      (rectBefore.top < 60 || rectBefore.bottom > window.innerHeight - 40)
    ) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    later(280, () => {
      if (cancelled) return;
      const rect = el.getBoundingClientRect();
      const taskA = el.dataset.swarmTaskA || "building";
      const taskB = el.dataset.swarmTaskB || "inspecting";
      setBot(bots[0], Math.max(16, rect.left + 24), Math.max(20, rect.top + 16), taskA);
      setBot(
        bots[1],
        Math.min(window.innerWidth - 40, rect.right - 28),
        Math.max(20, rect.top + 32),
        taskB,
      );
      el.classList.add("swarm-building-lead");

      // Element asks for a keyboard interaction (e.g. SPACEBAR).
      const interactCode = el.dataset.swarmInteract;
      if (interactCode) {
        later(350, () => {
          const keyBtn = document.querySelector(
            `button[data-code="${interactCode}"]`,
          );
          if (keyBtn) {
            keyBtn.classList.add("bg-rose-500", "translate-y-1");
            later(250, () =>
              keyBtn.classList.remove("bg-rose-500", "translate-y-1"),
            );
          }
        });
      }

      later(700, () => {
        if (cancelled) return;
        el.classList.remove("swarm-building-lead");
        bots[0].statusEl.textContent = "verified";
        bots[1].statusEl.textContent = "mounted";
        queueIndex++;
        later(380, runQueue);
      });
    });
  };

  const waitForPreloader = async () => {
    const deadline = Date.now() + 8000;
    for (;;) {
      const pre = document.getElementById("preloader");
      if (!pre) return;
      const style = window.getComputedStyle(pre);
      if (style.display === "none" || style.opacity === "0") return;
      if (Date.now() > deadline) return;
      await wait(300);
    }
  };

  const run = async () => {
    await waitForPreloader();
    if (cancelled) return;
    setBot(bots[0], window.innerWidth * 0.3, 90, "init");
    setBot(bots[1], window.innerWidth * 0.7, 90, "init");
    later(600, runQueue);
  };

  void run();

  return () => {
    cancelled = true;
    for (const id of timeouts) window.clearTimeout(id);
    timeouts.clear();
    for (const remove of listeners) remove();
    document
      .querySelectorAll(".swarm-building-lead")
      .forEach((el) => el.classList.remove("swarm-building-lead"));
    overlay.remove();
  };
}

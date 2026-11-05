// Swarm Cursors v4.3 — 16 UNNAMED cursors that look like they are
// building the website. The v4 tour (sequential queue over the 8
// .swarm-target sections, dashed outline on the active section,
// SPACEBAR press on the keyboard, smooth-scroll follow, park
// bottom-right) is kept, but the crew changes completely:
//
// - NO names, NO labels anywhere: no "agent:layout", no status pills,
//   no task tags. The cursors are just small coloured arrows.
// - 16 cursors: 2 leads (green, cyan) drive the tour — lead to the
//   top-left corner of the active section, sub to the top-right —
//   plus 14 small follower arrows that cluster around whatever
//   section is being built, drift while they work, and never sit
//   still. At the end the leads park bottom-right and the followers
//   keep wandering slowly around them, like the reference finale.
// - The page itself is never hidden (no blank canvas) and the tour
//   never blocks it: the overlay ignores pointer input, and once the
//   visitor scrolls, auto-scroll stops.
// Disabled on mobile (<=768px) and for prefers-reduced-motion.

export type SwarmCleanup = () => void;

type Bot = {
  color: string;
  lead: boolean;
  el: HTMLDivElement;
  icon: HTMLSpanElement;
  x: number;
  y: number;
  rx: number;
  ry: number;
  px: number;
  py: number;
  angle: number;
  speed: number;
  anchorX: number;
  anchorY: number;
  nextPick: number;
  active: boolean;
  activateAt: number;
};

const LEAD_COLORS = ["#00ff9d", "#38bdf8"];
const FOLLOWER_COLORS = [
  "#f472b6", "#fbbf24", "#a78bfa", "#fb7185",
  "#facc15", "#e2e8f0", "#f97316", "#84cc16",
  "#2dd4bf", "#e879f9", "#ef4444", "#818cf8",
  "#93c5fd", "#fda4af",
];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const lerpAngle = (a: number, b: number, t: number) => {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return a + d * t;
};

function arrowSvg(color: string, size: number): string {
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 22 22" fill="none" aria-hidden="true">` +
    `<path d="M2 1 L2 17.5 L6 13.6 L8.6 19.4 L11.2 18.2 L8.6 12.4 L14.5 12.4 Z" fill="${color}" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/>` +
    "</svg>"
  );
}

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
  let rafId = 0;
  let lastTick = 0;
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
  overlay.dataset.swarmVersion = "4.3";
  overlay.setAttribute("aria-hidden", "true");

  const makeBot = (color: string, lead: boolean): Bot => {
    const el = document.createElement("div");
    el.className = "swarm-bot" + (lead ? " swarm-bot--lead" : "");
    const icon = document.createElement("span");
    icon.className = "swarm-cursor-icon";
    icon.innerHTML = arrowSvg(color, lead ? 20 : 16);
    el.appendChild(icon);
    overlay.appendChild(el);
    const bot: Bot = {
      color,
      lead,
      el,
      icon,
      x: -100,
      y: -100,
      rx: -100,
      ry: -100,
      px: -100,
      py: -100,
      angle: 0,
      speed: rand(0.7, 1.3),
      anchorX: -100,
      anchorY: -100,
      nextPick: 0,
      active: lead,
      activateAt: 0,
    };
    // Position immediately: until the first move, a fixed element
    // with no transform renders at (0,0).
    el.style.transform = "translate3d(-100px, -100px, 0)";
    if (!lead) el.style.opacity = "0";
    return bot;
  };

  const leads: Bot[] = LEAD_COLORS.map((c) => makeBot(c, true));
  const followers: Bot[] = FOLLOWER_COLORS.map((c) => makeBot(c, false));
  const bots: Bot[] = [...leads, ...followers];
  document.body.appendChild(overlay);

  const setBot = (bot: Bot, x: number, y: number) => {
    const angle = (Math.atan2(y - bot.y, x - bot.x) * 180) / Math.PI + 135;
    bot.angle = lerpAngle(bot.angle, angle, 1);
    bot.icon.style.transform = `rotate(${bot.angle}deg)`;
    bot.x = x;
    bot.y = y;
    bot.rx = x;
    bot.ry = y;
    bot.px = x;
    bot.py = y;
    bot.el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  };

  // --- Visitor takes over ----------------------------------------------
  let userHasScrolled = false;
  const onUserGesture = () => {
    userHasScrolled = true;
  };
  on(window, "wheel", onUserGesture, { passive: true, once: true });
  on(window, "touchmove", onUserGesture, { passive: true, once: true });

  // --- Follower movement (one shared rAF ticker) -----------------------
  // Followers cluster around the section being built and never sit
  // still: every ~0.5s each picks a new nearby anchor point and
  // eases toward it, arrow rotating to face its movement.
  let activeTarget: HTMLElement | null = null;
  let parked = false;

  const pickAnchor = (f: Bot, now: number) => {
    if (activeTarget && !parked) {
      const r = activeTarget.getBoundingClientRect();
      // Inside the section or just around its edges.
      f.anchorX = Math.max(
        24,
        Math.min(
          window.innerWidth - 24,
          r.left - 20 + Math.random() * (r.width + 40),
        ),
      );
      f.anchorY = Math.max(
        24,
        Math.min(
          window.innerHeight - 24,
          r.top - 20 + Math.random() * (r.height + 40),
        ),
      );
      f.nextPick = now + rand(350, 650);
    } else {
      // Parked: loose cluster around the leads, bottom-right.
      const cx = window.innerWidth - 260;
      const cy = window.innerHeight - 170;
      f.anchorX = Math.max(24, Math.min(window.innerWidth - 24, cx + rand(-160, 160)));
      f.anchorY = Math.max(24, Math.min(window.innerHeight - 24, cy + rand(-80, 80)));
      f.nextPick = now + rand(1500, 3000);
    }
  };

  const tick = (now: number) => {
    if (cancelled) return;
    const dt = Math.min(50, now - (lastTick || now));
    lastTick = now;
    for (const f of followers) {
      if (!f.active || now < f.activateAt) continue;
      if (now > f.nextPick) pickAnchor(f, now);
      const k = 1 - Math.exp(-dt * 0.0042 * f.speed);
      const dx = f.anchorX - f.x;
      const dy = f.anchorY - f.y;
      f.x += dx * k;
      f.y += dy * k;
      const vx = f.x - f.px;
      const vy = f.y - f.py;
      if (Math.hypot(vx, vy) > 0.4) {
        const targetAngle = (Math.atan2(vy, vx) * 180) / Math.PI + 135;
        f.angle = lerpAngle(f.angle, targetAngle, 0.25);
      }
      f.px = f.x;
      f.py = f.y;
      f.rx = f.x;
      f.ry = f.y;
      f.el.style.transform = `translate3d(${f.x}px, ${f.y}px, 0)`;
      f.icon.style.transform = `rotate(${f.angle}deg)`;
    }
    rafId = requestAnimationFrame(tick);
  };

  // --- Tour (the two leads) --------------------------------------------
  let queueIndex = 0;

  const runQueue = () => {
    if (cancelled) return;
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(".swarm-target"),
    );
    if (queueIndex >= targets.length) {
      // Tour done: leads park bottom-right, followers keep wandering
      // slowly around them instead of vanishing.
      parked = true;
      activeTarget = null;
      setBot(leads[0], window.innerWidth - 260, window.innerHeight - 96);
      setBot(leads[1], window.innerWidth - 120, window.innerHeight - 96);
      return;
    }

    const el = targets[queueIndex];
    activeTarget = el;
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
      setBot(leads[0], Math.max(16, rect.left + 24), Math.max(20, rect.top + 16));
      setBot(
        leads[1],
        Math.min(window.innerWidth - 40, rect.right - 28),
        Math.max(20, rect.top + 32),
      );
      el.classList.add("swarm-building-lead");

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
    setBot(leads[0], window.innerWidth * 0.3, 90);
    setBot(leads[1], window.innerWidth * 0.7, 90);
    // Followers join one by one, staggered, like the reference
    // where the agent count grows during the tour.
    const startAt = performance.now();
    followers.forEach((f, i) => {
      f.x = i % 2 === 0 ? -40 : window.innerWidth + 40;
      f.y = window.innerHeight * (0.3 + 0.1 * (i % 5));
      f.px = f.x;
      f.py = f.y;
      f.rx = f.x;
      f.ry = f.y;
      f.anchorX = f.x;
      f.anchorY = f.y;
      f.activateAt = startAt + 400 + i * 150;
      later(400 + i * 150, () => {
        f.active = true;
        f.el.style.opacity = "1";
        f.nextPick = 0;
      });
    });
    lastTick = performance.now();
    rafId = requestAnimationFrame(tick);
    later(600, runQueue);
  };

  void run();

  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
    for (const id of timeouts) window.clearTimeout(id);
    timeouts.clear();
    for (const remove of listeners) remove();
    document
      .querySelectorAll(".swarm-building-lead")
      .forEach((el) => el.classList.remove("swarm-building-lead"));
    overlay.remove();
  };
}

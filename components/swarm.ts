// Swarm Cursors v4.8 — 16 UNNAMED cursors that BUILD the website
// from a BLANK page, SMOOTHLY, and then LEAVE. The page is blank
// from the very first frame after the preloader: the blank state
// is prepared at init, while the preloader is still fully opaque
// on top, so the finished page can never flash through the
// preloader's fade — and the WHOLE page is blank, because the
// sections themselves are hidden at prepare (raising a section
// above the blank exposed all of its children, not just the
// target: v4.7 leak) and the wrapper's border is hidden too. A
// section is revealed when its first target is built. Then the
// swarm builds it section by section: the two leads arrive, a
// dashed outline fades in, and the section rises + fades in inside
// it — then the next. When the build is done, the blank fades, the
// cursors park for a beat, then fade out and are removed entirely:
// a finished page has no cursors stuck at the bottom. The v4 tour
// (sequential queue over the 8 .swarm-target sections, SPACEBAR
// press on the keyboard, smooth-scroll follow) and the 16-arrow
// crew from v4.3 are kept:
//
// - NO names, NO labels anywhere: no "agent:layout", no status pills,
//   no task tags. The cursors are just small coloured arrows.
// - 16 cursors: 2 leads (green, cyan) drive the tour — lead to the
//   top-left corner of the active section, sub to the top-right —
//   plus 14 small follower arrows that cluster around whatever
//   section is being built, drift while they work, and never sit
//   still.
// - Smoothness: the scroll is given time to settle before the
//   leads arrive (and they re-measure once, gliding to the corrected
//   spot instead of jumping); the outline fades in/out instead of
//   popping; each section rises 14px while fading in over 0.7s.
//
// THE STACKING TRAP (v4.4 bug, fixed here): every content section
// lives inside one wrapper div with `backdrop-blur-xl`, which makes
// the wrapper its own stacking context. In v4.4 the blank layer was
// a child of <body> (z 9999), so raising a section to z 10000 did
// NOTHING — the whole wrapper, raised children included, stayed
// below the blank. Only the nav worked, because <header> is a
// direct child of <body>. In v4.5 the blank layer is a child of
// that wrapper instead, so the z-index fight happens INSIDE the
// wrapper's context: blank z 9999 < built sections z 10000, and
// the cursors (overlay z 10001, child of <body>) stay above all.
// Non-target content (footer, 1984 window, section headers) needs
// no hiding — the blank covers it, and it appears when the blank
// fades at the end of the tour.
// The tour never blocks the page: the layers ignore pointer input,
// and once the visitor scrolls, auto-scroll stops.
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

  // --- Blank layer + overlay + bots ----------------------------------
  // The blank layer covers the page so the tour starts from a blank
  // canvas. It MUST be a child of the content wrapper (deepest
  // common ancestor of the non-nav targets) — see the header
  // comment: the wrapper is a backdrop-blur stacking context, and
  // a blank living in <body> would sit above every section in it
  // no matter how high the sections are raised. Inside the wrapper
  // the fight is fair: blank z 9999 < built sections z 10000.
  // The nav is exempt: <header> is a direct child of <body>, so
  // raising the header puts it above the blank on its own.
  const findContentWrapper = (): HTMLElement | null => {
    const all = Array.from(
      document.querySelectorAll<HTMLElement>(".swarm-target"),
    );
    const content = all.filter((t) => !t.closest("header"));
    if (content.length === 0) return null;
    let node: HTMLElement | null = content[0].parentElement;
    while (node && node !== document.body) {
      if (content.every((t) => node!.contains(t))) return node;
      node = node.parentElement;
    }
    return null;
  };
  const wrapper = findContentWrapper();
  const blank = document.createElement("div");
  blank.className = "swarm-blank";
  blank.setAttribute("aria-hidden", "true");
  if (wrapper) {
    wrapper.appendChild(blank);
  } else {
    // Fallback: no wrapper found — cover the viewport directly.
    blank.style.position = "fixed";
    document.body.appendChild(blank);
  }

  const overlay = document.createElement("div");
  overlay.id = "swarm-overlay";
  overlay.className = "swarm-layer";
  overlay.dataset.swarmVersion = "4.8";
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

  // --- Blank-start: hide + raise targets -----------------------------
  // A section only becomes visible when it is built: it is hidden
  // (opacity 0) and raised above the blank layer from the start, so
  // revealing it is just a fade-in. #hero is a stacking context, so
  // it is raised too — otherwise its children could never rise
  // above the blank. The site's own .reveal scroll animation is
  // stripped from tour-owned elements so it cannot re-hide them.
  const raised: Array<{ el: HTMLElement; pos: string; z: string }> = [];
  const raise = (el: HTMLElement) => {
    if (el.style.zIndex === "10000") return;
    raised.push({ el, pos: el.style.position, z: el.style.zIndex });
    if (window.getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }
    el.style.zIndex = "10000";
  };
  const unraiseAll = () => {
    for (const r of raised) {
      r.el.style.position = r.pos;
      r.el.style.zIndex = r.z;
    }
    raised.length = 0;
  };

  const prepareTargets = () => {
    const hero = document.getElementById("hero");
    if (hero) raise(hero);
    // The nav lives inside the <header>, which is itself a stacking
    // context — raise it too or the nav could never rise above the
    // blank, no matter its own z-index.
    const header = document.querySelector("header");
    if (header) raise(header as HTMLElement);
    // Hide the wrapper's border while the page is blank, or its
    // rounded frame would show around the empty canvas.
    if (wrapper) wrapper.style.borderColor = "transparent";
    document
      .querySelectorAll<HTMLElement>(".swarm-target")
      .forEach((el) => {
        raise(el);
        el.classList.add("swarm-hidden");
        // Hide the whole section this target lives in too: raising
        // a section above the blank exposes ALL of its children,
        // not just the target (v4.7 leak: the hero's top bar, intro
        // paragraph and buttons showed from the start). The section
        // is revealed when its first target is built.
        const section = el.closest("section");
        if (section) section.classList.add("swarm-section-hidden");
        el.classList.remove("reveal");
        el.querySelectorAll(".reveal").forEach((d) => {
          d.classList.remove("reveal");
          (d as HTMLElement).style.transitionDelay = "";
        });
        el.style.transitionDelay = "";
      });
  };

  const revealAll = () => {
    document
      .querySelectorAll<HTMLElement>(
        ".swarm-hidden, .swarm-built, .swarm-section-hidden",
      )
      .forEach((el) => {
        el.classList.remove("swarm-hidden");
        el.classList.remove("swarm-built");
        el.classList.remove("swarm-section-hidden");
        el.style.opacity = "";
      });
    if (wrapper) wrapper.style.borderColor = "";
    unraiseAll();
  };

  // Full teardown: stop the ticker, clear timers, restore the page,
  // remove both layers. Idempotent — safe to call from the tour-end
  // path and from the React cleanup.
  let tornDown = false;
  const teardown = () => {
    if (tornDown) return;
    tornDown = true;
    cancelled = true;
    cancelAnimationFrame(rafId);
    for (const id of timeouts) window.clearTimeout(id);
    timeouts.clear();
    for (const remove of listeners) remove();
    document
      .querySelectorAll(".swarm-building-lead")
      .forEach((el) => el.classList.remove("swarm-building-lead"));
    revealAll();
    blank.remove();
    overlay.remove();
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
      // The blank canvas has done its job: fade it out to reveal the
      // rest of the page (footer, 1984 window, …), then restore the
      // built sections to their natural state.
      blank.style.opacity = "0";
      later(700, () => {
        revealAll();
        blank.remove();
      });
      // The build is done: let the cursors park for a beat, then
      // fade them out and remove them entirely — they must not sit
      // stuck at the bottom of a finished page.
      later(1400, () => {
        overlay.style.transition = "opacity .6s ease";
        overlay.style.opacity = "0";
      });
      later(2100, () => {
        teardown();
      });
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

    // Let the smooth scroll settle before the leads arrive, so they
    // do not chase a moving target.
    later(500, () => {
      if (cancelled) return;
      const placeLeads = () => {
        const r = el.getBoundingClientRect();
        setBot(leads[0], Math.max(16, r.left + 24), Math.max(20, r.top + 16));
        setBot(
          leads[1],
          Math.min(window.innerWidth - 40, r.right - 28),
          Math.max(20, r.top + 32),
        );
      };
      placeLeads();
      el.classList.add("swarm-building-lead");
      // The section is built now: rise + fade in inside its frame.
      el.classList.remove("swarm-hidden");
      el.classList.add("swarm-built");
      // Reveal the whole section this target lives in (it was hidden
      // at prepare so its non-target children could not leak). The
      // section only fades — the rise belongs to the target, so the
      // two do not stack.
      const section = el.closest("section");
      if (section) {
        section.classList.remove("swarm-section-hidden");
        section.classList.add("swarm-built");
      }
      // Re-measure once in case the scroll was still settling — the
      // leads glide smoothly to the corrected spot instead of
      // jumping.
      later(350, () => {
        if (!cancelled) placeLeads();
      });

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

      later(800, () => {
        if (cancelled) return;
        el.classList.remove("swarm-building-lead");
        queueIndex++;
        later(350, runQueue);
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
    // The page is already blank (prepared at init, under the
    // preloader) — just start from the top and bring the cursors in.
    window.scrollTo({ top: 0, behavior: "auto" });
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

  // Blank from the very first frame: hide the targets and cover the
  // page NOW, while the preloader is still fully opaque on top — so
  // the finished page can never flash through the preloader's fade.
  // The blank appears instantly (no transition on the way in) and
  // only fades out at the end of the tour. The tour itself still
  // waits for the preloader (run()).
  prepareTargets();
  blank.style.transition = "none";
  blank.style.opacity = "1";
  void blank.offsetWidth;
  blank.style.transition = "opacity .6s ease";

  run().catch(() => teardown());

  return teardown;
}

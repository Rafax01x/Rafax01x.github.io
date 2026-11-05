// Swarm Rebuild v3.2 — motion rebuilt from deep observation of the
// reference (demo videos, Joel Califa's original Swarm site, and our
// live v2). See ~/workspace/swarm-study/motion-spec-v3.md for the
// observation notes. No code was copied from either project: this
// engine is written from scratch for this site.
//
// v3.1 fixed the parallel-drag deadlock (per-drag state in a Set,
// performance.now() deadlines). v3.2 adds a progress watchdog: if the
// layer counter does not advance for 25 s the tour reveals everything
// instead of trapping the visitor on a black canvas — a stuck tour
// must never be worse than no tour. The layer also carries a
// data-swarm-version marker so a verification can prove which engine
// is actually running in the browser.
//
// What v3 changes vs v2: 16 agents (8 named leads + 8 unnamed workers
// who join during the tour, so the count grows); per-agent speed and
// curved (arc) travel with arrows that rotate to face their direction;
// agents never freeze — while working they drift in a slow random walk,
// idle agents wander at the viewport edges; tasks run IN PARALLEL
// inside each wave instead of one section at a time; frames are drawn
// by an agent dragging corner to corner (the frame grows with the
// cursor, white corner handles, live blue W x H badge, red guide
// lines, grey placeholder fill); typing uses an I-beam cursor with a
// blinking caret and the headline steps up in size; the intro is a
// loose ring orbiting the site mark that decays slowly; the finale
// leaves the agents wandering around the finished page instead of
// vanishing. No motion trails (the reference has none) and no sound
// in v3. Click, Esc, or the skip button reveals everything at once.
// Disabled on mobile (<=768px) and for prefers-reduced-motion.
// The overlay never intercepts clicks (pointer-events: none, except
// the skip button). If this script never runs, nothing is ever hidden:
// the blank/hidden state is only applied by this script at runtime.

export type SwarmCleanup = () => void;

type AgentMode = "orbit" | "decay" | "travel" | "work" | "wander" | "drag";
type CursorMode = "arrow" | "ibeam" | "crosshair";

type AgentDef = { name: string | null; color: string; role: string };
type Agent = AgentDef & {
  el: HTMLDivElement;
  icon: HTMLElement;
  x: number;
  y: number;
  rx: number;
  ry: number;
  px: number;
  py: number;
  tx: number;
  ty: number;
  jx: number;
  jy: number;
  jd: number;
  arcSign: number;
  speed: number;
  phase: number;
  mode: AgentMode;
  active: boolean;
  angle: number;
  wanderUntil: number;
  anchorX: number;
  anchorY: number;
  orbitAngle: number;
  departAt: number;
};

const LEADS: AgentDef[] = [
  { name: "agent:layout", color: "#00ff9d", role: "layout" },
  { name: "agent:ui", color: "#38bdf8", role: "ui" },
  { name: "agent:type", color: "#f472b6", role: "type" },
  { name: "agent:media", color: "#fbbf24", role: "media" },
  { name: "agent:motion", color: "#a78bfa", role: "motion" },
  { name: "agent:keys", color: "#fb7185", role: "keys" },
  { name: "agent:copy", color: "#facc15", role: "copy" },
  { name: "agent:qa", color: "#e2e8f0", role: "qa" },
];

const WORKERS: AgentDef[] = [
  { name: null, color: "#f97316", role: "w0" },
  { name: null, color: "#84cc16", role: "w1" },
  { name: null, color: "#2dd4bf", role: "w2" },
  { name: null, color: "#e879f9", role: "w3" },
  { name: null, color: "#ef4444", role: "w4" },
  { name: null, color: "#818cf8", role: "w5" },
  { name: null, color: "#93c5fd", role: "w6" },
  { name: null, color: "#fda4af", role: "w7" },
];

const BLUE = "#38bdf8";
const RED_GUIDE = "#f43f5e";

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const lerpAngle = (a: number, b: number, t: number) => {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return a + d * t;
};

function arrowSvg(color: string): string {
  return (
    '<svg width="16" height="16" viewBox="0 0 22 22" fill="none" aria-hidden="true">' +
    `<path d="M2 1 L2 17.5 L6 13.6 L8.6 19.4 L11.2 18.2 L8.6 12.4 L14.5 12.4 Z" fill="${color}" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/>` +
    "</svg>"
  );
}

function ibeamSvg(color: string): string {
  return (
    '<svg width="12" height="20" viewBox="0 0 12 20" fill="none" aria-hidden="true">' +
    `<path d="M6 1v18 M2 1h8 M2 19h8" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>` +
    "</svg>"
  );
}

function crosshairSvg(color: string): string {
  return (
    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">' +
    `<path d="M9 1v16 M1 9h16" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>` +
    "</svg>"
  );
}

type TaskKind = "fade" | "type" | "keys";
type Task = {
  id: string;
  label: string;
  el: HTMLElement;
  reveal: HTMLElement[];
  kind: TaskKind;
  layers: number;
  drawAgent: Agent;
  crew: Agent[];
  guide?: "h";
};
type Wave = {
  label: string;
  scrollTo: HTMLElement;
  revealAtStart: HTMLElement[];
  tasks: Task[];
  joinWorkers: Agent[];
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
  let watchdogId = 0;
  let lastTick = 0;
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

  // --- Layer -----------------------------------------------------------
  const layer = document.createElement("div");
  layer.className = "swarm-layer";
  layer.dataset.swarmVersion = "3.2";
  layer.setAttribute("aria-hidden", "true");

  const blank = document.createElement("div");
  blank.className = "swarm-blank";
  layer.appendChild(blank);

  const mark = document.createElement("div");
  mark.className = "swarm-mark";
  mark.textContent = "rafax01";
  layer.appendChild(mark);

  // Frame pool: up to 4 parallel tasks draw at once.
  type FrameBox = {
    el: HTMLDivElement;
    badge: HTMLSpanElement;
    inUse: boolean;
  };
  const frames: FrameBox[] = [];
  for (let i = 0; i < 4; i++) {
    const el = document.createElement("div");
    el.className = "swarm-frame";
    for (const pos of ["tl", "tr", "bl", "br"] as const) {
      const h = document.createElement("i");
      h.className = "swarm-handle";
      h.dataset.pos = pos;
      el.appendChild(h);
    }
    const badge = document.createElement("span");
    badge.className = "swarm-frame-badge";
    el.appendChild(badge);
    layer.appendChild(el);
    frames.push({ el, badge, inUse: false });
  }
  const acquireFrame = (): FrameBox => {
    const f = frames.find((x) => !x.inUse) ?? frames[0];
    f.inUse = true;
    return f;
  };
  const releaseFrame = (f: FrameBox) => {
    f.el.style.opacity = "0";
    f.el.classList.remove("swarm-frame--dragging", "swarm-frame--handles");
    f.inUse = false;
  };

  const guide = document.createElement("div");
  guide.className = "swarm-guide";
  layer.appendChild(guide);
  const showGuide = (y: number) => {
    guide.style.top = `${y}px`;
    guide.classList.add("on");
  };
  const hideGuide = () => guide.classList.remove("on");

  const toolbar = document.createElement("div");
  toolbar.className = "swarm-toolbar";
  const dots = document.createElement("span");
  dots.className = "swarm-toolbar-dots";
  const toolbarText = document.createElement("span");
  toolbarText.className = "swarm-toolbar-text";
  toolbarText.textContent = "Membangun…";
  const tourLabel = document.createElement("span");
  tourLabel.className = "swarm-toolbar-tour";
  tourLabel.textContent = "Touring";
  const speedLabel = document.createElement("span");
  speedLabel.className = "swarm-toolbar-speed";
  speedLabel.textContent = "1×";
  const skipBtn = document.createElement("button");
  skipBtn.className = "swarm-toolbar-skip";
  skipBtn.type = "button";
  skipBtn.textContent = "Lewati ×";
  toolbar.append(dots, toolbarText, tourLabel, speedLabel, skipBtn);
  layer.appendChild(toolbar);

  // --- Agents ----------------------------------------------------------
  const cx = () => window.innerWidth / 2;
  const cy = () => window.innerHeight * 0.38;

  const makeAgent = (def: AgentDef, index: number, isLead: boolean): Agent => {
    const el = document.createElement("div");
    el.className = "swarm-cursor";
    if (def.name) el.dataset.bot = def.name.replace("agent:", "");
    const icon = document.createElement("span");
    icon.className = "swarm-cursor-icon";
    icon.innerHTML = arrowSvg(def.color);
    el.appendChild(icon);
    if (def.name) {
      const tag = document.createElement("span");
      tag.className = "swarm-tag";
      tag.style.background = def.color;
      tag.textContent = def.name;
      el.appendChild(tag);
    }
    layer.appendChild(el);
    const angle = (index * Math.PI * 2) / 8 - Math.PI / 2;
    const x = isLead
      ? cx() + Math.cos(angle) * 130
      : -40;
    const y = isLead
      ? cy() + Math.sin(angle) * 130 * 0.62
      : window.innerHeight * 0.5;
    const agent: Agent = {
      ...def,
      el,
      icon,
      x,
      y,
      rx: x,
      ry: y,
      px: x,
      py: y,
      tx: x,
      ty: y,
      jx: x,
      jy: y,
      jd: 0,
      arcSign: Math.random() < 0.5 ? -1 : 1,
      speed: rand(0.7, 1.3),
      phase: rand(0, Math.PI * 2),
      mode: isLead ? "orbit" : "wander",
      active: isLead,
      angle: 0,
      wanderUntil: 0,
      anchorX: x,
      anchorY: y,
      orbitAngle: angle,
      departAt: 0,
    };
    // Position immediately: until the first rAF tick, a fixed element
    // with no transform renders at (0,0) — v3.0 flashed all 16 agents
    // stacked in the top-left corner on the first paint.
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (!isLead) el.style.opacity = "0";
    return agent;
  };

  const leads: Agent[] = LEADS.map((d, i) => makeAgent(d, i, true));
  const workers: Agent[] = WORKERS.map((d, i) => makeAgent(d, i, false));
  const agents: Agent[] = [...leads, ...workers];
  const byRole = (role: string): Agent =>
    agents.find((a) => a.role === role) ?? leads[0];
  document.body.appendChild(layer);

  let totalLayers = 54;
  let layersDone = 0;
  const activeCount = () => agents.filter((a) => a.active).length;

  const updateToolbar = () => {
    dots.innerHTML = agents
      .filter((a) => a.active)
      .map(
        (a) =>
          `<span style="background:${a.color}" title="${a.name ?? a.role}"></span>`,
      )
      .join("");
    toolbarText.textContent = `${activeCount()} agents · ${layersDone} / ${totalLayers} layers`;
  };

  const setCursorMode = (agent: Agent, mode: CursorMode) => {
    if (agent.icon.dataset.mode === mode) return;
    agent.icon.dataset.mode = mode;
    agent.icon.innerHTML =
      mode === "ibeam"
        ? ibeamSvg(agent.color)
        : mode === "crosshair"
          ? crosshairSvg(agent.color)
          : arrowSvg(agent.color);
  };

  // --- Raised elements (above the blank canvas) -----------------------
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
  let orbitStart = 0;
  let decayStart = 0;
  const ORBIT_R = 130;

  const setTarget = (
    agent: Agent,
    x: number,
    y: number,
    mode: AgentMode = "travel",
  ) => {
    agent.jx = agent.x;
    agent.jy = agent.y;
    agent.jd = Math.hypot(x - agent.x, y - agent.y);
    agent.arcSign = Math.random() < 0.5 ? -1 : 1;
    agent.tx = x;
    agent.ty = y;
    agent.mode = mode;
  };

  // Active drags: a SET, not one shared variable. v3.0 kept a single
  // `dragState`, so two parallel tasks overwrote each other's drag —
  // the second task's drag could never resolve and the tour stalled.
  // Each drag owns its state; the ticker updates all of them.
  type DragState = {
    agent: Agent;
    frame: FrameBox;
    rect: DOMRect;
    deadline: number;
    done: boolean;
    resolve: () => void;
  };
  const activeDrags = new Set<DragState>();

  const tick = (now: number) => {
    if (cancelled) return;
    const dt = Math.min(50, now - (lastTick || now));
    lastTick = now;

    for (const a of agents) {
      if (!a.active) continue;
      // Target by mode.
      if (a.mode === "orbit") {
        const t = (now - orbitStart) / 1000;
        a.orbitAngle += dt * 0.0016;
        const r = ORBIT_R + Math.sin(t * 0.7 + a.phase) * 16;
        a.tx = cx() + Math.cos(a.orbitAngle) * r;
        a.ty = cy() + Math.sin(a.orbitAngle) * r * 0.62;
      } else if (a.mode === "decay") {
        a.orbitAngle += dt * 0.0016;
        const grow = (now - decayStart) * 0.1;
        const r = ORBIT_R + grow;
        if (now >= a.departAt) {
          const ox = cx() + Math.cos(a.orbitAngle) * 380;
          const oy = cy() + Math.sin(a.orbitAngle) * 380 * 0.62;
          setTarget(
            a,
            Math.max(40, Math.min(window.innerWidth - 40, ox)),
            Math.max(40, Math.min(window.innerHeight - 40, oy)),
            "travel",
          );
        } else {
          a.tx = cx() + Math.cos(a.orbitAngle) * r;
          a.ty = cy() + Math.sin(a.orbitAngle) * r * 0.62;
        }
      } else if (a.mode === "work") {
        if (now > a.wanderUntil) {
          a.tx = a.anchorX + rand(-12, 12);
          a.ty = a.anchorY + rand(-12, 12);
          a.wanderUntil = now + rand(350, 650);
        }
      } else if (a.mode === "wander") {
        if (now > a.wanderUntil) {
          a.tx = rand(80, window.innerWidth - 80);
          a.ty = rand(80, window.innerHeight - 80);
          a.wanderUntil = now + rand(1800, 3000);
        }
      }
      // Steering: exponential approach, rate by mode (drag is fastest).
      const rate =
        a.mode === "drag" ? 0.009 : a.mode === "work" ? 0.003 : 0.0042;
      const k = 1 - Math.exp(-dt * rate * a.speed);
      const dx = a.tx - a.x;
      const dy = a.ty - a.y;
      const dist = Math.hypot(dx, dy);
      a.x += dx * k;
      a.y += dy * k;
      // Arc: perpendicular sine offset along the journey.
      const progress = a.jd > 0 ? Math.min(1, Math.max(0, 1 - dist / a.jd)) : 1;
      const amp =
        Math.sin(progress * Math.PI) * Math.min(90, a.jd * 0.18) * a.arcSign;
      let rx = a.x;
      let ry = a.y;
      if (dist > 1 && amp !== 0) {
        rx = a.x + (-dy / dist) * amp;
        ry = a.y + (dx / dist) * amp;
      }
      // Rotate the arrow to face its velocity.
      const vx = rx - a.px;
      const vy = ry - a.py;
      if (Math.hypot(vx, vy) > 0.4) {
        const targetAngle = (Math.atan2(vy, vx) * 180) / Math.PI + 135;
        a.angle = lerpAngle(a.angle, targetAngle, 0.25);
      }
      a.px = rx;
      a.py = ry;
      a.rx = rx;
      a.ry = ry;
      a.el.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      a.icon.style.transform = `rotate(${a.angle}deg)`;
    }

    // Drag frames grow with their agent's rendered position.
    for (const d of [...activeDrags]) {
      if (d.done) continue;
      const w = Math.max(
        0,
        Math.min(d.rect.width, d.agent.rx - d.rect.left),
      );
      const h = Math.max(
        0,
        Math.min(d.rect.height, d.agent.ry - d.rect.top),
      );
      d.frame.el.style.width = `${w}px`;
      d.frame.el.style.height = `${h}px`;
      d.frame.badge.textContent = `${Math.round(w)} × ${Math.round(h)}`;
      const cornerDist = Math.hypot(
        d.rect.right - d.agent.x,
        d.rect.bottom - d.agent.y,
      );
      // NOTE: `now` here is the rAF timestamp (same origin as
      // performance.now()), so the deadline must be set from
      // performance.now() too — never Date.now().
      if (cornerDist < 10 || now > d.deadline) {
        d.done = true;
        activeDrags.delete(d);
        d.frame.el.style.width = `${d.rect.width}px`;
        d.frame.el.style.height = `${d.rect.height}px`;
        d.frame.badge.textContent = `${Math.round(d.rect.width)} × ${Math.round(d.rect.height)}`;
        d.resolve();
      }
    }

    rafId = requestAnimationFrame(tick);
  };

  const waitForAgents = (list: Agent[], timeoutMs: number): Promise<void> =>
    new Promise((resolve) => {
      const start = Date.now();
      const iv = setInterval(() => {
        const done = list.every(
          (a) => Math.hypot(a.tx - a.x, a.ty - a.y) < 9,
        );
        if (done || Date.now() - start > timeoutMs) {
          clearInterval(iv);
          resolve();
        }
      }, 40);
    });

  // --- Jobs ------------------------------------------------------------
  const collectWaves = (): Wave[] => {
    const hero = document.getElementById("hero");
    const heroHeadline = document.getElementById("heroHeadline");
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
    const projects = document.getElementById("projects");
    const retro = document.getElementById("retroWindow1984");
    const keyboard = document.getElementById("threeContainer");
    const pillarCards = pillars
      ? (Array.from(pillars.querySelectorAll(".grid > div")) as HTMLElement[])
      : [];
    const keyCount = keyboard
      ? keyboard.querySelectorAll(".kb-key").length
      : 0;

    const topBar = hero?.children[0] as HTMLElement | undefined;
    const statsCol = hero?.querySelector(
      '[class*="col-span-4"]',
    ) as HTMLElement | null;
    const heroExtras = [topBar, statsCol].filter(
      (e): e is HTMLElement => !!e,
    );

    const layout = byRole("layout");
    const ui = byRole("ui");
    const type = byRole("type");
    const media = byRole("media");
    const motion = byRole("motion");
    const keys = byRole("keys");
    const copy = byRole("copy");
    const qa = byRole("qa");
    const W = (i: number) => workers[i];

    const waves: Wave[] = [];
    const mkTask = (
      id: string,
      label: string,
      el: HTMLElement | null | undefined,
      kind: TaskKind,
      layers: number,
      drawAgent: Agent,
      crew: Agent[],
      reveal?: HTMLElement[],
      guide?: "h",
    ): Task | null => {
      if (!el) return null;
      return {
        id,
        label,
        el,
        reveal: reveal ?? [el],
        kind,
        layers,
        drawAgent,
        crew: [drawAgent, ...crew],
        guide,
      };
    };
    const pushWave = (
      label: string,
      scrollTo: HTMLElement | null | undefined,
      revealAtStart: HTMLElement[],
      tasks: Array<Task | null>,
      joinWorkers: Agent[],
    ) => {
      const real = tasks.filter((t): t is Task => t !== null);
      if (!scrollTo || real.length === 0) return;
      waves.push({ label, scrollTo, revealAtStart, tasks: real, joinWorkers });
    };

    pushWave(
      "Navigasi",
      header,
      [],
      [
        mkTask("nav", "Navigasi", header, "fade", 1, layout, [ui, W(0)], undefined, "h"),
      ],
      [W(0)],
    );
    pushWave(
      "Hero",
      heroCol as HTMLElement | null,
      [],
      [
        mkTask(
          "headline",
          "Hero",
          heroCol as HTMLElement | null,
          "type",
          2,
          type,
          [copy, W(1)],
          [heroCol as HTMLElement, ...heroExtras],
        ),
        mkTask("keyboard", "Keyboard", keyboard, "keys", Math.max(keyCount, 1), layout, [keys, W(2)]),
      ],
      [W(1), W(2)],
    );
    pushWave(
      "Terminal",
      terminalPanel as HTMLElement | null,
      [],
      [
        mkTask("terminal", "Terminal", terminalPanel as HTMLElement | null, "fade", 1, ui, [media, W(3)]),
        mkTask("retro", "Jendela 1984", retro, "fade", 1, motion, [qa, W(4)]),
      ],
      [W(3), W(4)],
    );
    pushWave(
      "Pilar",
      pillars,
      pillars ? [pillars] : [],
      pillarCards.map((card, i) =>
        mkTask(
          `pillar-${i}`,
          "Pilar",
          card,
          "fade",
          1,
          [media, motion, copy][i % 3],
          // Distinct crew per card: one agent cannot be in two
          // parallel tasks (W5 was in two cards in v3.0).
          [[W(5)], [W(6)], [W(4)]][i % 3],
        ),
      ),
      [W(5), W(6)],
    );
    pushWave(
      "Proyek",
      projectsHeader,
      projects ? [projects] : [],
      [
        mkTask("proj-header", "Karya Terpilih", projectsHeader, "fade", 1, copy, [W(7)]),
        mkTask("card-1", "Kartu proyek", cards[0], "fade", 1, layout, [ui, W(1)], undefined, "h"),
        mkTask("card-2", "Kartu proyek", cards[1], "fade", 1, media, [motion, W(2)]),
        mkTask("lainnya", "LAINNYA", lainnya, "fade", 1, qa, [W(3)]),
      ],
      [W(7)],
    );
    pushWave(
      "Footer",
      footer,
      [],
      [mkTask("footer", "Footer", footer, "fade", 1, layout, [ui, copy, W(4), W(5)])],
      [],
    );

    totalLayers = waves.reduce(
      (sum, w) => sum + w.tasks.reduce((s, t) => s + t.layers, 0),
      0,
    );
    return waves;
  };

  // Headline typing state, so a skip mid-typing restores the full text.
  let headlineSpans: HTMLSpanElement[] = [];
  let headlineTexts: string[] = [];
  let caretEl: HTMLSpanElement | null = null;

  const restoreHeadline = () => {
    caretEl?.remove();
    caretEl = null;
    headlineSpans.forEach((span, i) => {
      span.textContent = headlineTexts[i] ?? span.textContent;
      span.style.fontSize = "";
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

  const revealAll = (waves: Wave[]) => {
    restoreHeadline();
    for (const wave of waves) {
      for (const el of wave.revealAtStart) {
        el.classList.remove("swarm-hidden");
        el.classList.remove("swarm-built");
        el.style.opacity = "";
      }
      for (const task of wave.tasks) {
        for (const el of task.reveal) {
          el.classList.remove("swarm-hidden");
          el.classList.remove("swarm-built");
          el.style.opacity = "";
          clearInlineHiding(el);
        }
      }
    }
    const sp = document.getElementById("scrollProgress");
    if (sp) sp.classList.remove("swarm-hidden");
    unraiseAll();
  };

  const finish = () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
    layer.style.transition = "opacity 1s ease";
    layer.style.opacity = "0";
    setTimeout(() => layer.remove(), 1050);
  };

  const skip = () => {
    if (cancelled) return;
    revealAll(collectWaves());
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

  const corners = (
    rect: DOMRect,
  ): Array<{ x: number; y: number }> => [
    { x: rect.left + 4, y: rect.top + 4 },
    { x: rect.right - 4, y: rect.top + 4 },
    { x: rect.left + 4, y: rect.bottom - 4 },
    { x: rect.right - 4, y: rect.bottom - 4 },
    { x: rect.left + rect.width / 2, y: rect.top + 4 },
    { x: rect.left + rect.width / 2, y: rect.bottom - 4 },
  ];

  const dragFrame = async (
    agent: Agent,
    rect: DOMRect,
    frame: FrameBox,
  ): Promise<void> => {
    frame.el.style.borderColor = BLUE;
    frame.el.style.transition = "none";
    frame.el.style.left = `${rect.left}px`;
    frame.el.style.top = `${rect.top}px`;
    frame.el.style.width = "0px";
    frame.el.style.height = "0px";
    frame.el.style.opacity = "1";
    frame.badge.textContent = "0 × 0";
    frame.el.classList.add("swarm-frame--dragging");
    setCursorMode(agent, "crosshair");
    setTarget(agent, rect.right - 2, rect.bottom - 2, "drag");
    await new Promise<void>((resolve) => {
      const state: DragState = {
        agent,
        frame,
        rect,
        // performance.now() origin — same clock as the rAF timestamp
        // the ticker compares against. (v3.0 used Date.now() here, an
        // epoch clock the ticker could never reach.)
        deadline: performance.now() + 1800,
        done: false,
        resolve,
      };
      activeDrags.add(state);
      setTimeout(() => {
        if (!state.done) {
          state.done = true;
          activeDrags.delete(state);
          // Snap the frame to its full size: a timeout-resolved drag
          // still leaves a finished-looking frame behind.
          state.frame.el.style.width = `${state.rect.width}px`;
          state.frame.el.style.height = `${state.rect.height}px`;
          state.frame.badge.textContent = `${Math.round(state.rect.width)} × ${Math.round(state.rect.height)}`;
          resolve();
        }
      }, 1900);
    });
    frame.el.classList.remove("swarm-frame--dragging");
    frame.el.classList.add("swarm-frame--handles");
    setCursorMode(agent, "arrow");
    agent.mode = "work";
    agent.anchorX = rect.right - 20;
    agent.anchorY = rect.bottom - 20;
    agent.wanderUntil = 0;
    setTimeout(() => frame.el.classList.remove("swarm-frame--handles"), 400);
  };

  const hideFrame = async (frame: FrameBox) => {
    frame.el.style.transition = "opacity .3s ease";
    frame.el.style.opacity = "0";
    await wait(320);
    releaseFrame(frame);
  };

  const typeHeadline = async (task: Task) => {
    const h1 = document.getElementById("heroHeadline");
    if (!h1 || headlineSpans.length === 0) return;
    const typeAgent = task.drawAgent;
    setCursorMode(typeAgent, "ibeam");
    const finalSize = parseFloat(getComputedStyle(h1).fontSize) || 48;
    caretEl = document.createElement("span");
    caretEl.className = "swarm-caret";
    for (let i = 0; i < headlineSpans.length; i++) {
      const span = headlineSpans[i];
      const text = headlineTexts[i] ?? "";
      span.textContent = "";
      span.style.fontSize = "18px";
      span.appendChild(caretEl);
      for (const ch of text) {
        if (cancelled) return;
        caretEl.before(document.createTextNode(ch));
        const r = caretEl.getBoundingClientRect();
        setTarget(typeAgent, r.left + 2, r.top + r.height / 2, "travel");
        await wait(60);
      }
      span.style.fontSize = `${Math.round(finalSize * 0.6)}px`;
      await wait(130);
      span.style.fontSize = "";
      await wait(90);
    }
    caretEl.remove();
    caretEl = null;
    setCursorMode(typeAgent, "arrow");
    typeAgent.mode = "work";
    typeAgent.anchorX = typeAgent.x;
    typeAgent.anchorY = typeAgent.y;
    typeAgent.wanderUntil = 0;
  };

  const staggerKeys = async (task: Task) => {
    const keys = Array.from(
      task.el.querySelectorAll(".kb-key"),
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
  };

  const runTask = async (task: Task) => {
    const rect = task.el.getBoundingClientRect();
    const pts = corners(rect);
    // Draw agent starts at the top-left corner; crew take the others.
    task.crew.forEach((a, i) => {
      const p = pts[i % pts.length];
      setTarget(a, p.x, p.y, "travel");
    });
    await waitForAgents(task.crew, 1500);
    if (cancelled) return;
    // Crew now drift in a slow random walk around their corners.
    task.crew.forEach((a, i) => {
      if (a === task.drawAgent) return;
      const p = pts[i % pts.length];
      a.mode = "work";
      a.anchorX = p.x;
      a.anchorY = p.y;
      a.wanderUntil = 0;
    });
    const frame = acquireFrame();
    if (task.guide) showGuide(rect.bottom);
    await dragFrame(task.drawAgent, rect, frame);
    if (cancelled) return;
    for (const el of task.reveal) {
      raise(el);
      el.classList.remove("swarm-hidden");
      el.classList.add("swarm-built");
    }
    if (task.kind === "type") {
      await typeHeadline(task);
    } else if (task.kind === "keys") {
      await staggerKeys(task);
    } else {
      await wait(380);
    }
    if (cancelled) return;
    await hideFrame(frame);
    hideGuide();
    layersDone += task.layers;
    updateToolbar();
    for (const a of task.crew) {
      if (a.mode === "work" || a.mode === "drag") a.mode = "wander";
    }
  };

  const scrollToWave = async (wave: Wave) => {
    const rect = wave.scrollTo.getBoundingClientRect();
    if (rect.top < 100 && rect.bottom > window.innerHeight - 100) return;
    const top = window.scrollY + rect.top - 90;
    window.scrollTo({ top, behavior: "smooth" });
    await wait(750);
  };

  const joinWorkers = (list: Agent[]) => {
    list.forEach((w, i) => {
      if (w.active) return;
      w.active = true;
      w.el.style.opacity = "1";
      const fromLeft = i % 2 === 0;
      w.x = fromLeft ? -40 : window.innerWidth + 40;
      w.y = window.innerHeight * (0.3 + 0.13 * i);
      w.rx = w.x;
      w.ry = w.y;
      w.px = w.x;
      w.py = w.y;
      w.mode = "wander";
      w.wanderUntil = 0;
    });
    updateToolbar();
  };

  const run = async () => {
    await waitForPreloader();
    if (cancelled) return;
    const waves = collectWaves();
    if (waves.length === 0) {
      finish();
      return;
    }

    // Blank canvas: hide everything this rebuild owns.
    const hero = document.getElementById("hero");
    if (hero) raise(hero);
    for (const wave of waves) {
      for (const el of wave.revealAtStart) {
        el.classList.add("swarm-hidden");
        el.classList.remove("reveal");
        el.querySelectorAll(".reveal").forEach((d) => {
          d.classList.remove("reveal");
          (d as HTMLElement).style.transitionDelay = "";
        });
      }
      for (const task of wave.tasks) {
        for (const el of task.reveal) {
          el.classList.add("swarm-hidden");
          el.classList.remove("reveal");
          el.querySelectorAll(".reveal").forEach((d) => {
            d.classList.remove("reveal");
            (d as HTMLElement).style.transitionDelay = "";
          });
          el.style.transitionDelay = "";
        }
      }
    }
    const sp = document.getElementById("scrollProgress");
    if (sp) sp.classList.add("swarm-hidden");

    // Headline starts empty at 18px so the typing is the first thing
    // seen — never a flash of the finished text.
    const h1 = document.getElementById("heroHeadline");
    if (h1) {
      headlineSpans = Array.from(
        h1.querySelectorAll("span"),
      ) as HTMLSpanElement[];
      headlineTexts = headlineSpans.map((s) => s.textContent ?? "");
      headlineSpans.forEach((s) => {
        s.textContent = "";
        s.style.fontSize = "18px";
      });
    }

    window.scrollTo({ top: 0, behavior: "auto" });
    blank.style.transition = "opacity .35s ease";
    blank.style.opacity = "1";
    mark.classList.add("on");
    await wait(380);
    if (cancelled) return;

    updateToolbar();
    lastTick = performance.now();
    rafId = requestAnimationFrame(tick);

    // Progress watchdog: a healthy tour advances the layer counter
    // at least every few seconds. If it is stuck for 25 s, reveal
    // everything instead of leaving the visitor on a black canvas.
    let lastLayersSeen = layersDone;
    let lastProgressAt = Date.now();
    watchdogId = window.setInterval(() => {
      if (cancelled || layersDone >= totalLayers) {
        window.clearInterval(watchdogId);
        watchdogId = 0;
        return;
      }
      if (layersDone > lastLayersSeen) {
        lastLayersSeen = layersDone;
        lastProgressAt = Date.now();
      } else if (Date.now() - lastProgressAt > 25000) {
        window.clearInterval(watchdogId);
        watchdogId = 0;
        skip();
      }
    }, 1000);

    // Intro: leads orbit the site mark in a loose ring, then the ring
    // decays slowly — agents leave one by one at different speeds.
    orbitStart = performance.now();
    await wait(2200);
    if (cancelled) return;
    mark.classList.remove("on");
    decayStart = performance.now();
    leads.forEach((a, i) => {
      a.mode = "decay";
      a.departAt = decayStart + i * 170;
    });
    await wait(1900);
    if (cancelled) return;

    for (const wave of waves) {
      if (cancelled) return;
      await scrollToWave(wave);
      if (cancelled) return;
      for (const el of wave.revealAtStart) {
        raise(el);
        el.classList.remove("swarm-hidden");
        el.classList.add("swarm-built");
      }
      joinWorkers(wave.joinWorkers);
      const busy = new Set(wave.tasks.flatMap((t) => t.crew));
      for (const a of agents) {
        if (a.active && !busy.has(a) && a.mode !== "wander") {
          a.mode = "wander";
          a.wanderUntil = 0;
        }
      }
      await Promise.all(wave.tasks.map((t) => runTask(t)));
    }
    if (cancelled) return;

    // Finale: the agents do NOT vanish. They drift into a loose
    // cluster and keep wandering around the finished page.
    toolbarText.textContent = `Selesai · ${activeCount()} agents · ${layersDone} / ${totalLayers} layers`;
    for (const a of agents) {
      if (a.active) {
        a.mode = "wander";
        a.wanderUntil = 0;
      }
    }
    const sp2 = document.getElementById("scrollProgress");
    if (sp2) sp2.classList.remove("swarm-hidden");
    await wait(6000);
    if (cancelled) return;
    document.documentElement.dataset.swarmDone = "true";
    unraiseAll();
    for (const wave of waves) {
      for (const el of wave.revealAtStart) el.classList.remove("swarm-built");
      for (const task of wave.tasks) {
        for (const el of task.reveal) el.classList.remove("swarm-built");
      }
    }
    finish();
  };

  void run();

  return () => {
    if (!cancelled) {
      revealAll(collectWaves());
    }
    cancelled = true;
    cancelAnimationFrame(rafId);
    if (watchdogId) window.clearInterval(watchdogId);
    for (const remove of listeners) remove();
    layer.remove();
  };
}

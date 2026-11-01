export type Project = {
  id: string;
  title: string;
  category: "Web" | "Tools" | "Android";
  year: string;
  description: string;
  stack: string[];
  detail: string;
  link: string;
  linkLabel: string;
};

export const projects: Project[] = [
  {
    id: "rafax01-portfolio",
    title: "rafax01 — Portfolio",
    category: "Web",
    year: "2026",
    description: "This site itself: a premium, motion-first portfolio with preloader, custom cursor, pinned project showcase, and reduced-motion fallbacks.",
    stack: ["Next.js", "TypeScript", "Tailwind", "Framer Motion", "GSAP", "Lenis"],
    detail:
      "Built as the first web proof for the Rafax01x brand: a single page that has to feel fast on a phone, not just look good on desktop. Preloader runs once per session, heavy effects are gated off on touch and reduced-motion devices, and every project on it is real shipped work.",
    link: "https://github.com/Rafax01x",
    linkLabel: "GitHub profile",
  },
  {
    id: "kafekas",
    title: "KafeKas — Cafe POS",
    category: "Android",
    year: "2025",
    description: "A cafe cashier that actually survives a busy shift: fast ordering, held orders, kitchen slips, and daily reports.",
    stack: ["Expo", "React Native", "TypeScript", "SQLite"],
    detail:
      "Built for a real cafe counter. 3-column cashier grid, dine-in and takeaway, cash plus static QRIS, void-only deletion with day-lock, and a floating order bucket. v1.0.4 shipped and used daily.",
    link: "https://github.com/Rafax01x",
    linkLabel: "GitHub profile",
  },
  {
    id: "nisky",
    title: "Nisky — Nail Salon Booking",
    category: "Android",
    year: "2025",
    description: "Booking for a nail salon, no login, no Play Store friction. Gallery, try-on, services, and WhatsApp checkout.",
    stack: ["Expo", "React Native", "TypeScript", "AsyncStorage"],
    detail:
      "Gallery with filters, service add-ons, slot blocking with booking codes, order tracking by phone and code, and a hidden admin area for services and photos. v1.1.0 shipped.",
    link: "https://github.com/Rafax01x",
    linkLabel: "GitHub profile",
  },
  {
    id: "rubber-roast",
    title: "rubber-roast",
    category: "Tools",
    year: "2025",
    description: "A VS Code extension that roasts your code on save — empty catches, console.log spam, and TODO comments.",
    stack: ["TypeScript", "VS Code API"],
    detail:
      "Small, funny, and useful. It scans on save and delivers the roast in Indonesian or English, without slowing down the editor. v1.0.0 released.",
    link: "https://github.com/Rafax01x/rubber-roast",
    linkLabel: "View on GitHub",
  },
  {
    id: "diff-risk",
    title: "diff-risk-classifier",
    category: "Tools",
    year: "2025",
    description: "A portable, read-only skill that classifies merge risk of a diff as LOW, MEDIUM, or HIGH, with a verification checklist.",
    stack: ["Markdown", "Agent Skills"],
    detail:
      "It never modifies code. It reads a diff, weighs blast radius, and returns a risk class plus what to verify before merging. Built to be reused across projects.",
    link: "https://github.com/Rafax01x/diff-risk-classifier",
    linkLabel: "View on GitHub",
  },
  {
    id: "simpen",
    title: "Simpen — Secure Notes",
    category: "Android",
    year: "2025",
    description: "Safe notes and important numbers, encrypted on device, fast on a 4 GB phone.",
    stack: ["Expo", "React Native", "TypeScript"],
    detail:
      "The cold-start problem was the whole project: a heavy key-derivation self-test on every launch was cut down so the app opens in 2–3 seconds instead of 20+. v1.0.5 shipped.",
    link: "https://github.com/Rafax01x",
    linkLabel: "GitHub profile",
  },
];

export const skills = [
  "Next.js", "React", "TypeScript", "Tailwind CSS", "Framer Motion",
  "GSAP", "React Native", "Expo", "Node.js", "PostgreSQL",
  "SQLite", "Git", "Figma", "Three.js", "Vercel",
];

export const stats = [
  { value: 5, suffix: "", label: "Products shipped" },
  { value: 2, suffix: "", label: "Open-source tools" },
  { value: 3, suffix: "", label: "Android apps in use" },
  { value: 100, suffix: "%", label: "Built to be judged on a real phone" },
];

# rafax01 — Creative Developer Portfolio

Premium, motion-first personal landing page. Next.js 15 (App Router) + TypeScript,
Tailwind CSS v4, Framer Motion, GSAP + ScrollTrigger, Lenis smooth scroll, SplitType.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm start
```

## Structure

```
app/
  layout.tsx      # metadata, og tags, fonts (Clash Display / General Sans via Fontshare, system mono fallback)
  page.tsx        # single-page composition, progress bar, floating nav, preloader
  globals.css     # Tailwind v4 theme, noise overlay, marquee/float keyframes
components/
  Preloader.tsx
  sections/{Hero,About,Projects,Skills,Contact}.tsx
  ui/{MagneticButton,Cursor,TextReveal,Marquee,button}.tsx
  animations/variants.ts
lib/
  motion.ts       # shared easing [0.83, 0, 0.17, 1] + variants
  useLenis.ts     # Lenis, lerp 0.1, skipped on reduced motion / touch
  data.ts         # real projects, skills, stats (no lorem ipsum)
public/
  favicon.svg     # gradient "R"
```

## Notes and deliberate choices

- **Brand name on the site is `rafax01`**, as specified. GitHub is `Rafax01x`
  and Threads is `@rafa0x1` — those real links are used in Contact.
- **React Three Fiber is skipped.** It was optional in the spec. The animated
  gradient mesh + noise carry the hero visual at far lower bundle/GPU cost,
  which keeps the Lighthouse 90+ target realistic.
- **Email:** the magnetic Contact button uses the user's real inbox,
  as supplied by the user for this public portfolio
  (see `components/sections/Contact.tsx`).
- **Preloader runs once per session** via `sessionStorage`, max ~2.5s.
- **Reduced motion:** Lenis, parallax, magnetic, marquee, and custom cursor
  are disabled or fall back to simple fades. Custom cursor is fine-pointer only.
- **Projects:** KafeKas, Nisky, rubber-roast, diff-risk-classifier, Simpen —
  real shipped work, with a shared-layout detail modal.
- **Antislop note:** the requested violet → cyan → lime gradient is used as a
  specific, directed mesh (not a generic purple-gradient card), with real
  content and no placeholder fluff — that is the filter's intent, applied to
  your direction.

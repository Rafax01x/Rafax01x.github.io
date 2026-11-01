import type Lenis from "lenis";

let lenisInstance: Lenis | null = null;

export function setLenis(instance: Lenis | null) {
  lenisInstance = instance;
}

export function getLenis(): Lenis | null {
  return lenisInstance;
}

/** Anchor navigation that goes through Lenis when it exists, else native scroll. */
export function scrollToSection(hash: string) {
  const el = document.querySelector(hash);
  if (!el) return;
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(el as HTMLElement, { offset: -80, duration: 1.2 });
  } else {
    (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

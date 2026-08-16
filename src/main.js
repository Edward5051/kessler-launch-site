import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import { initHero } from "./hero.js";
import { initOperatives } from "./operatives.js";
import { initTour } from "./tour.js";
import { initClose } from "./close.js";
import { initCursor } from "./cursor.js";

gsap.registerPlugin(ScrollTrigger);

// entrance curve cubic-bezier(0.16,1,0.3,1) ≈ expo.out
// exit curve cubic-bezier(0.7,0,0.84,0) ≈ expo.in
export const ENTER = "expo.out";
export const EXIT = "expo.in";

export const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const touch = window.matchMedia("(hover: none)").matches;

let lenis = null;

if (!reducedMotion) {
  lenis = new Lenis({ duration: 1.2 });
  lenis.on("scroll", ScrollTrigger.update);
  // Lenis only emits for scrolls it drives — keep scrollbar drags, keyboard
  // paging and programmatic jumps in sync too.
  window.addEventListener("scroll", () => ScrollTrigger.update(), { passive: true });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

export { lenis };

initHero({ lenis, reducedMotion, touch });
initOperatives({ reducedMotion, touch });
initTour({ reducedMotion });
initClose({ reducedMotion });
initCursor({ reducedMotion, touch });

// The display face loads late and the ops rows are set in it at 9.5vw —
// remeasure every trigger once fonts are in.
document.fonts.ready.then(() => ScrollTrigger.refresh());

if (import.meta.env.DEV || window.location.hostname === "localhost") {
  window.__ST = ScrollTrigger;
}

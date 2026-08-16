import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ENTER } from "./main.js";

// Closing frame: hull stamp, one line, and the only fully saturated element
// on the page. The green enters as a bloom of glow that settles as the
// button comes to rest — heat with falloff, not a flat swap.
export function initClose({ reducedMotion }) {
  const section = document.querySelector(".close");
  const reveals = [...section.querySelectorAll(".reveal .reveal-inner")];
  const cta = section.querySelector(".close__cta");

  if (reducedMotion) return;

  ScrollTrigger.create({
    trigger: section,
    start: "top 55%",
    once: true,
    onEnter: () => {
      gsap.to(reveals, {
        y: 0,
        duration: 0.9,
        ease: ENTER,
        stagger: 0.12,
      });
      gsap.fromTo(
        cta,
        {
          autoAlpha: 0,
          y: 14,
          boxShadow: "0 0 90px rgba(200,255,26,0.85), 0 0 200px rgba(200,255,26,0.5)",
        },
        {
          autoAlpha: 1,
          y: 0,
          boxShadow: "0 0 22px rgba(200,255,26,0.28), 0 0 70px rgba(200,255,26,0.12)",
          duration: 1.6,
          delay: 0.35,
          ease: ENTER,
          clearProps: "boxShadow",
        }
      );
    },
  });
}

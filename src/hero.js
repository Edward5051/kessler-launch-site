import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const FRAME_COUNT = 120;
const FRAME_URL = (i) => `/frames/hero-${String(i + 1).padStart(3, "0")}.webp`;

// Idle playback speed: the clip drifts at ~40% speed until the visitor scrolls.
// The push isn't loopable, so idle ping-pongs through its first stretch instead
// of hard-cutting back to frame 0.
const IDLE_FPS = 6;
const IDLE_RANGE = 44;

export function initHero({ lenis, reducedMotion, touch }) {
  const section = document.querySelector(".hero");
  const canvas = section.querySelector(".hero__canvas");
  const title = section.querySelector(".hero__title");
  const sub = section.querySelector(".hero__sub");
  const loader = section.querySelector(".hero__loader");
  const hint = section.querySelector(".hero__hint");

  // Touch and reduced-motion get the poster frame; no sequence, no pin.
  if (reducedMotion || touch) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const images = new Array(FRAME_COUNT);
  let loaded = 0;
  let ready = false;

  // ---- state driven each tick ----
  let mode = "idle";        // "idle" → clip drifts on its own; "scrub" → scroll drives
  let idleFrame = 0;        // float frame index advanced by time
  let scrollProgress = 0;   // 0..1 from the pinned ScrollTrigger
  let current = 0;          // lerped frame index actually drawn
  let lastDrawn = -1;
  let lastTime = performance.now();

  // Hold scroll until the link is established.
  lenis?.stop();
  document.documentElement.style.overflow = "hidden";

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    lastDrawn = -1; // force redraw
  }
  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);

  function draw(index) {
    const img = images[index];
    if (!img) return;
    // cover-fit
    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const w = iw * scale, h = ih * scale;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    lastDrawn = index;
  }

  // ---- preload every frame before the section becomes interactive ----
  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    const done = () => {
      images[i] = img;
      loaded++;
      loader.textContent = `[ESTABLISHING LINK — ${Math.round((loaded / FRAME_COUNT) * 100)}%]`;
      if (i === 0 && lastDrawn === -1) draw(0);
      if (loaded === FRAME_COUNT) onReady();
    };
    // onload rather than decode() — decode() promises can hang in some
    // environments, and stalling the whole page on them isn't worth it.
    img.onload = done;
    img.onerror = done;
    img.src = FRAME_URL(i);
    if (img.complete && img.naturalWidth) {
      img.onload = img.onerror = null;
      done();
    }
  }

  function onReady() {
    ready = true;
    lastTime = performance.now();
    gsap.to(loader, { autoAlpha: 0, duration: 0.5, ease: "expo.in" });
    gsap.to(hint, { autoAlpha: 1, duration: 0.9, delay: 0.6, ease: "expo.out" });
    gsap.to(sub, { autoAlpha: 1, duration: 0.9, delay: 0.3, ease: "expo.out" });
    document.documentElement.style.overflow = "";
    lenis?.start();
    // pin lengths shift once the loader releases scroll — remeasure everything
    ScrollTrigger.refresh();
  }

  // ---- first scroll input hands the clip over to scroll control ----
  function engage() {
    if (mode === "scrub" || !ready) return;
    mode = "scrub";
    gsap.to(hint, { autoAlpha: 0, duration: 0.4, ease: "expo.in" });
    window.removeEventListener("wheel", engage);
    window.removeEventListener("touchstart", engage);
  }
  window.addEventListener("wheel", engage, { passive: true });
  window.addEventListener("touchstart", engage, { passive: true });

  // ---- pinned scrub: 8 s of footage stretched over 420vh of scroll ----
  // One ScrollTrigger owns the pin; the title compression rides its timeline
  // so both can never disagree about start/end.
  const scrubTl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "+=420%",
      pin: true,
      scrub: true,
      onUpdate: (self) => {
        scrollProgress = self.progress;
        if (self.progress > 0.001) engage();
      },
    },
  });

  // The title compresses as the camera closes on the light.
  scrubTl.fromTo(
    title,
    { letterSpacing: "0.035em" },
    { letterSpacing: "-0.012em", ease: "none", duration: 1 }
  );

  // ---- one render loop; idle and scrub only differ in what sets the target ----
  gsap.ticker.add(() => {
    if (!ready) return;
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    let target;
    if (mode === "idle") {
      idleFrame = (idleFrame + dt * IDLE_FPS) % (IDLE_RANGE * 2);
      target = idleFrame < IDLE_RANGE ? idleFrame : IDLE_RANGE * 2 - idleFrame;
    } else {
      target = scrollProgress * (FRAME_COUNT - 1);
    }

    // Lerp eases the idle→scrub handover and smooths the scrub itself.
    current += (target - current) * Math.min(1, dt * 8);

    const index = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(current)));
    if (index !== lastDrawn) draw(index);
  });
}

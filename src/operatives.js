import gsap from "gsap";
import { ENTER, EXIT } from "./main.js";

// Hover scrub drives video.currentTime directly. The delivery encodes are
// all-intra (keyframe every frame), so seeking lands instantly in every
// browser — no canvas fallback needed, and no reliance on negative
// playbackRate, which browsers don't support for reverse play.
export function initOperatives({ reducedMotion, touch }) {
  const section = document.querySelector(".ops");
  const videos = [...section.querySelectorAll(".ops__video")];
  const rows = [...section.querySelectorAll(".ops__row")];

  // Lazy-load the four clips as the section approaches.
  const loadObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      videos.forEach((v) => {
        v.src = v.dataset.src;
        v.preload = "auto";
        v.load();
      });
      loadObserver.disconnect();
    },
    { rootMargin: "100% 0px" }
  );
  loadObserver.observe(section);

  // ---- touch: no hover — play each turn once as its row enters ----
  if (touch) {
    rows.forEach((row) => {
      const video = videos[row.dataset.op];
      const spec = row.querySelector(".ops__spec .reveal-inner");
      let played = false;
      const io = new IntersectionObserver(
        (entries) => {
          if (!entries[0].isIntersecting || played) return;
          played = true;
          row.classList.add("is-active");
          section.classList.add("ops--engaged");
          gsap.to(spec, { y: 0, duration: 0.7, ease: ENTER });
          if (!reducedMotion) {
            gsap.to(video, { autoAlpha: 1, duration: 0.5, ease: ENTER });
            video.loop = false;
            video.play().catch(() => {});
            video.onended = () => {
              gsap.to(video, { autoAlpha: 0, duration: 0.8, ease: EXIT, delay: 0.4 });
              row.classList.remove("is-active");
              section.classList.remove("ops--engaged");
            };
          }
          io.disconnect();
        },
        { threshold: 0.6 }
      );
      io.observe(row);
    });
    return;
  }

  // ---- desktop: pointer-position-driven select + cursor scrub ----
  // mouseenter/mouseleave go stale when smooth scroll moves the rows under a
  // stationary cursor — the browser only re-evaluates hover on pointer
  // movement, and Chrome can drop the enter event entirely after the shift.
  // So the active row is recomputed from the cursor position on every
  // mousemove AND every scroll, never from boundary events.
  let activeRow = null;
  let targetTime = 0;
  let holdTimer = null;
  let mouseX = -1;
  let mouseY = -1;

  // one rAF lerp drives whichever clip is active
  gsap.ticker.add(() => {
    if (!activeRow) return;
    const video = videos[activeRow.dataset.op];
    if (!video.duration) return;
    const t = video.currentTime + (targetTime - video.currentTime) * 0.18;
    if (Math.abs(t - video.currentTime) > 0.005) video.currentTime = t;
  });

  function seekFromCursor() {
    if (!activeRow) return;
    const video = videos[activeRow.dataset.op];
    if (!video.duration) return;
    const rect = activeRow.getBoundingClientRect();
    const x = (mouseX - rect.left) / rect.width;
    targetTime = Math.max(0, Math.min(1, x)) * (video.duration - 0.05);
  }

  function activate(row) {
    clearTimeout(holdTimer);
    activeRow = row;
    const video = videos[row.dataset.op];
    const spec = row.querySelector(".ops__spec .reveal-inner");
    row.classList.add("is-active");
    section.classList.add("ops--engaged");
    video.pause();
    gsap.killTweensOf(video);
    gsap.to(video, { autoAlpha: 1, duration: 0.55, ease: ENTER });
    // slow on the reveal
    gsap.killTweensOf(spec);
    gsap.to(spec, { y: 0, duration: 0.75, ease: ENTER });
    seekFromCursor();
  }

  function syncActive() {
    if (mouseX < 0) return;
    const el = document.elementFromPoint(mouseX, mouseY);
    const row = el && el.closest ? el.closest(".ops__row") : null;
    if (row === activeRow) return;
    if (activeRow) release(activeRow, !!row);
    if (row) activate(row);
  }

  window.addEventListener(
    "mousemove",
    (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      syncActive();
      seekFromCursor();
    },
    { passive: true }
  );

  // smooth scroll slides rows under a stationary cursor — re-resolve
  window.addEventListener("scroll", syncActive, { passive: true });

  document.documentElement.addEventListener("mouseleave", () => {
    mouseX = mouseY = -1;
    if (activeRow) release(activeRow, false);
  });

  function release(row, immediate) {
    const video = videos[row.dataset.op];
    const spec = row.querySelector(".ops__spec .reveal-inner");
    row.classList.remove("is-active");
    // fast on the release
    gsap.killTweensOf(spec);
    gsap.to(spec, { y: "120%", duration: 0.25, ease: EXIT });
    if (activeRow === row) activeRow = null;
    if (!document.querySelector(".ops__row.is-active")) {
      section.classList.remove("ops--engaged");
    }
    const fade = () => {
      gsap.killTweensOf(video);
      gsap.to(video, { autoAlpha: 0, duration: 0.6, ease: EXIT });
    };
    if (immediate) fade();
    else {
      // hold the frame for a beat, then fade
      clearTimeout(holdTimer);
      holdTimer = setTimeout(fade, 400);
    }
  }
}

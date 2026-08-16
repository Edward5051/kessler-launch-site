import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Pinned horizontal tour: three full-bleed plates, dwell at each one long
// enough to read its caption. The scrubbed timeline is
// [dwell, move, dwell, move, dwell] so the pause is built into the scroll map.
export function initTour({ reducedMotion }) {
  const section = document.querySelector(".tour");
  const track = section.querySelector(".tour__track");
  const panels = [...section.querySelectorAll(".tour__panel")];
  const videos = [...section.querySelectorAll(".tour__video")];
  const captions = [...section.querySelectorAll(".tour__caption")];

  // Lazy-load plates as the section approaches.
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
    { rootMargin: "120% 0px" }
  );
  loadObserver.observe(section);

  // ---- caption typing ----
  const typers = captions.map(() => null);
  function typeCaption(i) {
    const el = captions[i];
    const text = el.dataset.text;
    if (el.dataset.done === "1") return;
    clearInterval(typers[i]);
    el.dataset.done = "1";
    let n = 0;
    el.textContent = "";
    typers[i] = setInterval(() => {
      n++;
      el.textContent = text.slice(0, n);
      if (n >= text.length) clearInterval(typers[i]);
    }, 22);
  }
  function clearCaption(i) {
    clearInterval(typers[i]);
    captions[i].dataset.done = "0";
    captions[i].textContent = "";
  }

  let centered = -1;
  function setCentered(i) {
    if (centered === i) return;
    if (centered >= 0) {
      videos[centered].pause();
      if (i >= 0) clearCaption(centered);
    }
    centered = i;
    if (i >= 0) {
      videos[i].play().catch(() => {});
      typeCaption(i);
    }
  }

  // ---- reduced motion: ordinary vertical sections, captions set in CSS ----
  if (reducedMotion) {
    panels.forEach((panel, i) => {
      new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) videos[i].play().catch(() => {});
          else videos[i].pause();
        },
        { threshold: 0.4 }
      ).observe(panel);
    });
    return;
  }

  // ---- pinned horizontal scrub with dwells ----
  const DWELL = 0.7; // relative to a move of 1
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "+=350%",
      pin: true,
      scrub: true,
      onUpdate: (self) => {
        // centred plate from progress through the [dwell,move,dwell,move,dwell] map
        const total = DWELL * 3 + 2;
        const p = self.progress * total;
        let i;
        if (p < DWELL + 0.5) i = 0;
        else if (p < DWELL * 2 + 1.5) i = 1;
        else i = 2;
        setCentered(self.isActive ? i : self.progress <= 0 ? -1 : 2);
      },
      onLeave: () => setCentered(-1),
      onLeaveBack: () => setCentered(-1),
      onEnter: () => setCentered(0),
      onEnterBack: () => setCentered(2),
    },
  });

  tl.to({}, { duration: DWELL });
  tl.to(track, { xPercent: -100 / 3, duration: 1, ease: "none" });
  tl.to({}, { duration: DWELL });
  tl.to(track, { xPercent: -200 / 3, duration: 1, ease: "none" });
  tl.to({}, { duration: DWELL });

  // slight parallax: each plate's media slides against its caption during
  // moves — folded into the same scrubbed timeline as the track.
  panels.forEach((panel, i) => {
    const media = panel.querySelector(".tour__media");
    tl.fromTo(
      media,
      { xPercent: i === 0 ? 0 : 6 },
      { xPercent: i === panels.length - 1 ? 0 : -6, ease: "none", duration: tl.duration() },
      0
    );
  });
}

import gsap from "gsap";

// Custom reticle cursor — bone-white crosshair in the HUD language.
// mix-blend-mode: difference keeps it legible over black, bone type and
// footage alike. Native cursor only hidden while this one is live.
export function initCursor({ reducedMotion, touch }) {
  if (touch || reducedMotion) return;

  const el = document.createElement("div");
  el.className = "cursor";
  el.innerHTML = `
    <svg class="cursor__reticle" viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <circle cx="17" cy="17" r="9" stroke="#E6E1D5" stroke-width="1"/>
      <path d="M17 2v6M17 26v6M2 17h6M26 17h6" stroke="#E6E1D5" stroke-width="1"/>
      <circle cx="17" cy="17" r="1.3" fill="#E6E1D5"/>
    </svg>`;
  document.body.appendChild(el);
  document.documentElement.classList.add("has-cursor");

  let x = innerWidth / 2;
  let y = innerHeight / 2;
  let tx = x;
  let ty = y;

  window.addEventListener(
    "mousemove",
    (e) => {
      tx = e.clientX;
      ty = e.clientY;
      el.classList.add("cursor--visible");
      const hot = e.target.closest && e.target.closest("a, button, .ops__row");
      el.classList.toggle("cursor--hot", !!hot);
    },
    { passive: true }
  );

  document.documentElement.addEventListener("mouseleave", () =>
    el.classList.remove("cursor--visible")
  );

  gsap.ticker.add(() => {
    x += (tx - x) * 0.3;
    y += (ty - y) * 0.3;
    el.style.transform = `translate(${x}px, ${y}px)`;
  });
}

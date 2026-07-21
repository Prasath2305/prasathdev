import gsap from "gsap";

/** Nudges every .magnetic element toward the cursor on hover, springs back on leave. */
export function initMagnetic() {
  document.querySelectorAll<HTMLElement>(".magnetic").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      gsap.to(el, { x: x * 0.3, y: y * 0.35, duration: 0.4, ease: "power3.out" });
    });

    el.addEventListener("mouseleave", () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
    });
  });
}

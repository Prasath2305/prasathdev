import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { lenis } from "../lenis";

export function initFooter() {
  gsap.registerPlugin(ScrollTrigger);

  const yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = `© ${new Date().getFullYear()} Prasath. All rights reserved.`;

  const name = document.querySelector<HTMLElement>(".footer-name");
  if (name) {
    gsap.set(name, { opacity: 0, y: 40 });
    gsap.to(name, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      ease: "power3.out",
      scrollTrigger: { trigger: name, start: "top 90%" },
    });
  }

  const backToTop = document.getElementById("back-to-top");
  backToTop?.addEventListener("click", () => {
    lenis.scrollTo(0);
  });
}

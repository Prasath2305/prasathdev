import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

export function initPreloader(onDone: () => void) {
  gsap.registerPlugin(SplitText);

  const root = document.getElementById("preloader");
  const counterEl = root?.querySelector<HTMLElement>("h1");
  const counterContainer = root?.querySelector<HTMLElement>(".preloader-counter");
  const fill = root?.querySelector<HTMLElement>(".preloader-bar__fill");
  if (!root || !counterEl || !counterContainer || !fill) return onDone();

  const finish = () => {
    gsap.to(root, {
      opacity: 0,
      duration: 0.6,
      ease: "power2.out",
      onComplete: () => {
        root.classList.add("is-done");
        root.style.display = "none";
        onDone();
      },
    });
  };

  const counter = { value: 0 };
  const tl = gsap.timeline();

  tl.to(counter, {
    value: 100,
    duration: 3,
    ease: "power3.out",
    onUpdate: () => {
      counterEl.textContent = String(Math.floor(counter.value));
    },
    onComplete: () => {
      const split = SplitText.create(counterEl, { type: "chars", charsClass: "digit" });
      gsap.to(split.chars, {
        x: "-100%",
        duration: 0.75,
        ease: "power3.out",
        stagger: 0.1,
        delay: 0.4,
        onComplete: finish,
      });
    },
  });

  tl.to(fill, { scaleX: 1, duration: 3, ease: "power3.out" }, "<");
}

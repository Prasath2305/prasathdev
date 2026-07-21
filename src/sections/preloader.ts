import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";

export function initPreloader(onDone: () => void) {
  gsap.registerPlugin(SplitText, CustomEase);
  if (!CustomEase.get("hop")) CustomEase.create("hop", "0.9, 0, 0.1, 1");

  const root = document.getElementById("preloader");
  const counterEl = root?.querySelector<HTMLElement>("h1");
  const counterContainer = root?.querySelector<HTMLElement>(".preloader-counter");
  const fill = root?.querySelector<HTMLElement>(".preloader-bar__fill");
  if (!root || !counterEl || !counterContainer || !fill) return onDone();

  // These live outside the preloader, so the reveal below can animate the
  // hero itself into view instead of just fading the preloader away.
  const heroLens = document.querySelector<HTMLElement>(".hero-lens");
  const heroStage = document.querySelector<HTMLElement>(".hero-lens__stage");
  const heroTitle = document.querySelector<HTMLElement>(".hero-dynamic-text");

  const titleSplit = heroTitle
    ? SplitText.create(heroTitle, { type: "chars", charsClass: "reveal-char", mask: "chars" })
    : null;
  if (titleSplit) gsap.set(titleSplit.chars, { xPercent: 100 });

  const counter = { value: 0 };
  const tl = gsap.timeline({ onComplete: onDone });

  tl.to(
    counter,
    {
      value: 100,
      duration: 3,
      ease: "power3.out",
      onUpdate: () => {
        counterEl.textContent = String(Math.floor(counter.value));
      },
      onComplete: () => {
        const digitSplit = SplitText.create(counterEl, { type: "chars", charsClass: "digit" });
        gsap.to(digitSplit.chars, {
          x: "-100%",
          duration: 0.75,
          ease: "power3.out",
          stagger: 0.1,
          delay: 0.3,
          onComplete: () => counterContainer.remove(),
        });
      },
    },
    0,
  );

  tl.to(fill, { scaleX: 1, duration: 3, ease: "power3.out" }, 0);

  tl.to(
    root,
    {
      opacity: 0,
      duration: 0.6,
      ease: "power2.out",
      onComplete: () => {
        root.classList.add("is-done");
        root.style.display = "none";
      },
    },
    3.5,
  );

  if (heroLens && heroStage) {
    tl.to(heroLens, { clipPath: "polygon(35% 35%, 65% 35%, 65% 65%, 35% 65%)", duration: 1.5, ease: "hop" }, 4.5);
    tl.to(heroStage, { scale: 1.5, duration: 1.5, ease: "hop" }, 4.5);

    tl.to(heroLens, { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", duration: 2, ease: "hop" }, 6);
    tl.to(heroStage, { scale: 1, duration: 2, ease: "hop" }, 6);
  }

  if (titleSplit) {
    tl.to(titleSplit.chars, { xPercent: 0, duration: 1, ease: "power4.out", stagger: 0.075 }, 7);
  }
}

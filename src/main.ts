import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { lenis } from "./lenis";

import { initPreloader } from "./sections/preloader";
import { initNavigation } from "./sections/navigation";
import { initHero } from "./sections/hero";
import { initAbout } from "./sections/about";
import { initProjects } from "./sections/projects";
import { initSkills } from "./sections/skills";
import { initMusic } from "./sections/music";
import { initContact } from "./sections/contact";
import { initFooter } from "./sections/footer";
import { initMagnetic } from "./magnetic";

gsap.registerPlugin(ScrollTrigger);

lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// Smooth-scroll same-page anchor links (nav menu, footer) through Lenis.
document.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest('a[href^="#"]');
  if (!target) return;
  const id = target.getAttribute("href");
  if (!id || id === "#") return;
  const el = document.querySelector(id);
  if (!el) return;
  e.preventDefault();
  lenis.scrollTo(el as HTMLElement);
});

initNavigation();

lenis.stop();
initPreloader(() => {
  lenis.start();
  ScrollTrigger.refresh();
});

// Deferred to a macrotask so the preloader's counter tween gets a clean
// first tick before this heavier, synchronous work (WebGL scenes, texture
// atlases, the physics engine) runs — otherwise that blocking setup delays
// GSAP's very first frame for the tween, and with lag smoothing disabled
// the whole delay gets applied as one big jump, making the counter appear
// to skip straight to 100.
setTimeout(() => {
  initHero();
  initAbout();
  initProjects();
  initSkills();
  initMusic();
  initContact();
  initFooter();
  initMagnetic();
}, 0);

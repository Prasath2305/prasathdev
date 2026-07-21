import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Axis = "h" | "v";

interface LaneConfig {
  label: string;
  href: string;
  axis: Axis;
  rowClass: string;
  /** xPercent/yPercent the track starts at and loops through for the infinite marquee. */
  from: number;
  to: number;
  duration: number;
}

const LANES: LaneConfig[] = [
  { label: "Home", href: "#home", axis: "h", rowClass: "lane--row-1", from: 0, to: -50, duration: 26 },
  { label: "About", href: "#about", axis: "h", rowClass: "lane--row-2", from: -50, to: 0, duration: 30 },
  { label: "What I Do", href: "#what-i-do", axis: "h", rowClass: "lane--row-3", from: 0, to: -50, duration: 32 },
  { label: "Projects", href: "#projects", axis: "h", rowClass: "lane--row-4", from: -50, to: 0, duration: 28 },
  { label: "Music", href: "#music", axis: "h", rowClass: "lane--row-5", from: 0, to: -50, duration: 34 },
  { label: "Skills", href: "#skills", axis: "v", rowClass: "lane--col-1", from: 0, to: -50, duration: 26 },
  { label: "Contact", href: "#contact", axis: "v", rowClass: "lane--col-2", from: -50, to: 0, duration: 30 },
];

function laneGroupHtml(lane: LaneConfig) {
  const star = lane.axis === "h" ? `<span class="lane__star">✦</span>` : `<span class="lane__star lane__star--v">✦</span>`;
  const wordClass = lane.axis === "h" ? "lane__word" : "lane__word lane__word--v";
  const word = `<span class="${wordClass}">${lane.label}</span>`;
  const items = new Array(3).fill(`${word}${star}`).join("");
  const groupClass = lane.axis === "h" ? "lane__group" : "lane__group lane__group--v";
  return `<span class="${groupClass}">${items}</span>`;
}

function laneHtml(lane: LaneConfig, index: number) {
  const trackClass = lane.axis === "h" ? "lane__track" : "lane__track lane__track--v";
  const groups = laneGroupHtml(lane) + laneGroupHtml(lane);
  return `
    <a href="${lane.href}" class="lane lane--${lane.axis} ${lane.rowClass}" data-lane-index="${index}">
      <div class="${trackClass}" data-track-index="${index}">${groups}</div>
    </a>
  `;
}

export function initNavigation() {
  gsap.registerPlugin(ScrollTrigger);

  const nav = document.querySelector(".nav");
  const menu = document.getElementById("nav-menu");
  const toggle = document.getElementById("nav-toggle");
  const lanesContainer = document.getElementById("nav-menu-lanes");
  const brandMark = document.getElementById("nav-brand-mark");
  const labels = toggle?.querySelectorAll<HTMLElement>("[data-label]");
  if (!nav || !menu || !toggle || !lanesContainer || !labels) return;

  // Only frost the nav from Projects onward — the sections before it
  // (Hero/About/What I Do) rely on the brand mark's difference blend instead.
  const projects = document.getElementById("projects");
  if (projects) {
    ScrollTrigger.create({
      trigger: projects,
      start: "top 90%",
      onEnter: () => nav.classList.add("nav--blurred"),
      onLeaveBack: () => nav.classList.remove("nav--blurred"),
    });
  }

  lanesContainer.innerHTML = LANES.map(laneHtml).join("");
  const laneEls = Array.from(lanesContainer.querySelectorAll<HTMLElement>(".lane"));
  const trackEls = Array.from(lanesContainer.querySelectorAll<HTMLElement>("[data-track-index]"));

  // Below 760px every lane (including the vertical Skills/Contact ones)
  // stacks into a horizontal-text list — see the mobile block in
  // navigation.css — so their marquees need to drive xPercent too, not the
  // yPercent they use in the desktop crosshatch layout.
  const stackedLayout = window.matchMedia("(max-width: 760px)");

  // Seamless infinite marquee: each track holds two identical copies of its
  // content, so animating to -50% lands exactly at the start of the second
  // copy — the loop restart is invisible.
  let marquees: gsap.core.Tween[] = [];

  function buildMarquees() {
    const stacked = stackedLayout.matches;
    marquees = LANES.map((lane, i) => {
      const track = trackEls[i];
      const prop = lane.axis === "h" || stacked ? "xPercent" : "yPercent";
      gsap.set(track, { [prop]: lane.from });
      return gsap.to(track, { [prop]: lane.to, duration: lane.duration, ease: "none", repeat: -1 });
    });
  }

  buildMarquees();

  stackedLayout.addEventListener("change", () => {
    marquees.forEach((tween) => tween.kill());
    trackEls.forEach((track) => gsap.set(track, { xPercent: 0, yPercent: 0 }));
    buildMarquees();
  });

  laneEls.forEach((laneEl, i) => {
    laneEl.addEventListener("mouseenter", () => {
      gsap.to(marquees[i], { timeScale: 0.08, duration: 0.8, ease: "power2.out", overwrite: "auto" });
    });
    laneEl.addEventListener("mouseleave", () => {
      gsap.to(marquees[i], { timeScale: 1, duration: 0.8, ease: "power2.out", overwrite: "auto" });
    });
  });

  if (brandMark) {
    gsap.to(brandMark, { rotate: 360, duration: 8, ease: "none", repeat: -1, transformOrigin: "50% 50%" });
  }

  gsap.set(labels[1], { yPercent: 100, opacity: 0 });

  laneEls.forEach((laneEl) => {
    const isRow = laneEl.classList.contains("lane--h");
    const rowIndex = LANES.findIndex((l) => laneEl.classList.contains(l.rowClass));
    if (isRow) {
      const fromRight = rowIndex % 2 === 0;
      gsap.set(laneEl, { xPercent: fromRight ? 100 : -100, opacity: 0 });
    } else {
      const fromBottom = laneEl.classList.contains("lane--col-1");
      gsap.set(laneEl, { yPercent: fromBottom ? 100 : -100, opacity: 0 });
    }
  });

  const tl = gsap.timeline({ paused: true, defaults: { ease: "power4.out" } });
  tl.to(menu, { opacity: 1, duration: 0.25, ease: "power2.out" }, 0);

  laneEls.forEach((laneEl, i) => {
    const isRow = laneEl.classList.contains("lane--h");
    const prop = isRow ? "xPercent" : "yPercent";
    tl.to(laneEl, { [prop]: 0, opacity: 1, duration: 0.9 }, 0.06 * (i + 1));
  });

  tl.to(labels[0], { yPercent: -100, opacity: 0, duration: 0.35, ease: "power2.out" }, 0);
  tl.to(labels[1], { yPercent: 0, opacity: 1, duration: 0.35, ease: "power2.out" }, 0.15);

  let isOpen = false;

  function open() {
    menu!.classList.add("is-open");
    menu!.setAttribute("aria-hidden", "false");
    nav!.classList.add("nav--menu-open", "nav--on-menu");
    toggle!.setAttribute("aria-label", "Close menu");
    toggle!.setAttribute("aria-expanded", "true");
    tl.timeScale(1).play();
    isOpen = true;
  }

  function close() {
    menu!.classList.remove("is-open");
    menu!.setAttribute("aria-hidden", "true");
    nav!.classList.remove("nav--menu-open", "nav--on-menu");
    toggle!.setAttribute("aria-label", "Open menu");
    toggle!.setAttribute("aria-expanded", "false");
    tl.timeScale(1.4).reverse();
    isOpen = false;
  }

  toggle.addEventListener("click", () => (isOpen ? close() : open()));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) close();
  });

  laneEls.forEach((laneEl) => {
    laneEl.addEventListener("click", close);
  });
}

const map = (x: number, a: number, b: number, c: number, d: number) =>
  ((x - a) * (d - c)) / (b - a) + c;
const lerp = (a: number, b: number, n: number) => (1 - n) * a + n * b;
const clamp = (val: number, min: number, max: number) => Math.max(Math.min(val, max), min);

// Stretches the scroll distance the sweep is spread over (>1 = slower),
// while keeping the text fully hidden off-path at the moment it enters the
// viewport — only the pace through the middle changes, not the start point.
const SWEEP_DOMAIN_STRETCH = 2.2;

interface Project {
  title: string;
  tags: string;
  description: string;
  cover: string;
  link?: string;
}

const PROJECTS: Project[] = [
  {
    title: "Helmet Detection & Number Plate Extraction",
    tags: "Python · YOLO · OpenCV",
    description:
      "A real-time AI system for road safety, combining image recognition for helmet detection with automatic number-plate extraction.",
    cover: "/img/projects/proj-1.svg",
    link: "https://github.com/Prasath2305/Helmet-and-number-recognition",
  },
  {
    title: "Placements Preparation Portal",
    tags: "React · Node.js · MongoDB",
    description:
      "A full-stack portal engineered from concept to deployment to help students prepare for campus placements.",
    cover: "/img/projects/proj-2.svg",
  },
  {
    title: "Home Surveillance & Alert Messaging",
    tags: "Python · Computer Vision",
    description:
      "A home security solution with real-time intrusion detection and integrated alert messaging.",
    cover: "/img/projects/proj-3.svg",
    link: "https://github.com/Prasath2305/Surveillance",
  },
  {
    title: "Artificial Vision",
    tags: "Python",
    description: "Computer vision experiments — see GitHub for details.",
    cover: "/img/projects/proj-4.svg",
    link: "https://github.com/Prasath2305/Artificial-Vision",
  },
  {
    title: "Election",
    tags: "HTML · JavaScript",
    description: "A web app for election-related workflows — see GitHub for details.",
    cover: "/img/projects/proj-5.svg",
    link: "https://github.com/Prasath2305/election",
  },
  {
    title: "Substance Abuse Awareness",
    tags: "Python",
    description: "Awareness & detection project — see GitHub for details.",
    cover: "/img/projects/proj-6.svg",
    link: "https://github.com/Prasath2305/substance-abuse",
  },
];

const FLOWING_TEXT = [
  {
    className: "svgtext svgtext--1",
    pathId: "text-curve1",
    d: "M 0 130 Q 250 180 500 130 Q 750 80 1000 130",
    filter: "blur",
    text: "Built end to end, from interface to database.",
  },
  {
    className: "svgtext",
    pathId: "text-curve2",
    d: "M 0 130 Q 250 80 500 130 Q 750 180 1000 130",
    filter: "blur2",
    text: "Shipped for real users, not just demos.",
  },
];

function cardHtml(p: Project, i: number) {
  const num = String(i + 1).padStart(2, "0");
  const linkHtml = p.link
    ? `<a class="grid__item-link" href="${p.link}" target="_blank" rel="noreferrer">View on GitHub</a>`
    : "";
  return `
    <div class="grid__item">
      <span class="grid__item-number">${num}</span>
      <img class="grid__item-img" src="${p.cover}" alt="${p.title}" loading="lazy" />
      <h3 class="grid__item-title">${p.title}</h3>
      <p class="grid__item-tags">${p.tags}</p>
      <p class="grid__item-description">${p.description}</p>
      ${linkHtml}
    </div>
  `;
}

function flowingTextHtml(f: (typeof FLOWING_TEXT)[number]) {
  return `
    <svg class="${f.className}" data-filter-type="blur" width="100%" preserveAspectRatio="xMidYMid meet" viewBox="0 0 1000 200">
      <path id="${f.pathId}" d="${f.d}" fill="none"/>
      <text filter="url(#${f.filter})"><textPath href="#${f.pathId}">${f.text}</textPath></text>
    </svg>
  `;
}

function renderGrid() {
  const container = document.getElementById("projects-grid");
  if (!container) return;

  let html = "";
  for (let i = 0; i < PROJECTS.length; i += 2) {
    const pair = PROJECTS.slice(i, i + 2);
    html += `<div class="grid">${pair.map((p, j) => cardHtml(p, i + j)).join("")}</div>`;

    const gapIndex = i / 2;
    const isLastPair = i + 2 >= PROJECTS.length;
    if (!isLastPair && gapIndex < FLOWING_TEXT.length) {
      html += flowingTextHtml(FLOWING_TEXT[gapIndex]);
    }
  }
  container.innerHTML = html;
}

class FilterPrimitive {
  el: SVGFEGaussianBlurElement | null;

  constructor(id: string) {
    this.el = document.querySelector<SVGFEGaussianBlurElement>(`${id} > feGaussianBlur`);
  }

  update(distance: number) {
    if (!this.el) return;
    const min = Number(this.el.dataset.minDeviation ?? 0);
    const max = Number(this.el.dataset.maxDeviation ?? 10);
    const value = clamp(map(distance, 0, 400, min, max), min, max);
    this.el.setAttribute("stdDeviation", String(value));
  }
}

class TextOnPath {
  svg: SVGSVGElement;
  text: SVGTextElement;
  textPath: SVGTextPathElement;
  filterPrimitive: FilterPrimitive | null;
  pathLength: number;
  positionY: number;
  startOffset = { value: 0, amt: 0.14 };
  scroll = { value: window.pageYOffset, amt: 0.17 };
  isVisible = false;
  entered = false;

  constructor(svgEl: SVGSVGElement) {
    this.svg = svgEl;
    this.text = svgEl.querySelector("text")!;
    this.textPath = this.text.querySelector("textPath")!;

    const filterId = this.text
      .getAttribute("filter")
      ?.match(/url\(["']?([^"']*)["']?\)/)?.[1];
    this.filterPrimitive = filterId ? new FilterPrimitive(filterId) : null;

    this.pathLength = svgEl.querySelector("path")!.getTotalLength();
    const rect = svgEl.getBoundingClientRect();
    this.positionY = rect.top + window.pageYOffset;

    window.addEventListener("resize", () => {
      const r = svgEl.getBoundingClientRect();
      this.positionY = r.top + window.pageYOffset;
    });

    this.startOffset.value = this.computeOffset();
    this.updateTextPathOffset();

    new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        this.isVisible = entry.intersectionRatio > 0;
        if (!this.isVisible) {
          this.entered = false;
          this.update();
        }
      });
    }).observe(svgEl);

    requestAnimationFrame(() => this.render());
  }

  computeOffset() {
    return map(
      this.positionY - window.pageYOffset,
      window.innerHeight,
      -window.innerHeight * (SWEEP_DOMAIN_STRETCH - 1),
      this.pathLength,
      -this.pathLength / 2
    );
  }

  updateTextPathOffset() {
    this.textPath.setAttribute("startOffset", String(this.startOffset.value));
  }

  update() {
    const currentOffset = this.computeOffset();
    this.startOffset.value = !this.entered
      ? currentOffset
      : lerp(this.startOffset.value, currentOffset, this.startOffset.amt);
    this.updateTextPathOffset();

    const currentScroll = window.pageYOffset;
    this.scroll.value = !this.entered
      ? currentScroll
      : lerp(this.scroll.value, currentScroll, this.scroll.amt);
    const distance = Math.abs(this.scroll.value - currentScroll);
    this.filterPrimitive?.update(distance);

    if (!this.entered) this.entered = true;
  }

  render() {
    if (this.isVisible) this.update();
    requestAnimationFrame(() => this.render());
  }
}

export function initProjects() {
  renderGrid();
  document
    .querySelectorAll<SVGSVGElement>("svg.svgtext")
    .forEach((el) => new TextOnPath(el));
}

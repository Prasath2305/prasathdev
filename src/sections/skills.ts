import Matter from "matter-js";

const WORDS = [
  "react",
  "next.js",
  "node.js",
  "python",
  "javascript",
  "typescript",
  "tailwind",
  "gsap",
  "mongodb",
  "supabase",
  "framer",
  "three.js",
  "aws",
  "gcp",
  "docker",
  "ci/cd",
  "git",
  "sql",
];

export function initSkills() {
  const { Engine, Runner, World, Bodies, Body, Mouse, MouseConstraint, Common, Events } = Matter;

  const stage = document.getElementById("skills-stage");
  const reset = document.getElementById("skills-reset");
  const section = document.getElementById("skills");
  if (!stage || !reset || !section) return;

  const engine = Engine.create();
  const world = engine.world;
  world.gravity.y = 1.2;
  Runner.run(Runner.create(), engine);

  let walls: Matter.Body[] = [];

  function buildWalls() {
    walls.forEach((w) => World.remove(world, w));
    const w = window.innerWidth;
    const h = window.innerHeight;
    const t = 200;
    walls = [
      Bodies.rectangle(w / 2, h + t / 2, w * 2, t, { isStatic: true }),
      Bodies.rectangle(-t / 2, h / 2, t, h * 2, { isStatic: true }),
      Bodies.rectangle(w + t / 2, h / 2, t, h * 2, { isStatic: true }),
    ];
    World.add(world, walls);
  }
  buildWalls();

  const items: { el: HTMLElement; body: Matter.Body; w: number; h: number }[] = [];

  function spawn(text: string, i: number) {
    const el = document.createElement("span");
    el.className = "word";
    el.textContent = text;
    stage!.appendChild(el);

    const r = el.getBoundingClientRect();
    const startX = Common.random(r.width / 2 + 20, window.innerWidth - r.width / 2 - 20);
    const startY = -200 - i * 140;

    const body = Bodies.rectangle(startX, startY, r.width, r.height, {
      restitution: 0.3,
      friction: 0.4,
      frictionAir: 0.005,
      density: 0.0014,
      angle: Common.random(-0.4, 0.4),
    });
    World.add(world, body);
    items.push({ el, body, w: r.width, h: r.height });
  }

  let spawned = false;
  function spawnAll() {
    if (spawned) return;
    spawned = true;
    WORDS.forEach((w, i) => setTimeout(() => spawn(w, i), i * 150));
  }

  new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && spawnAll()),
    { threshold: 0.2 }
  ).observe(section);

  const mouse = Mouse.create(stage);
  mouse.element.removeEventListener("wheel", (mouse as any).mousewheel);
  mouse.element.removeEventListener("DOMMouseScroll", (mouse as any).mousewheel);

  const mc = MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.18, damping: 0.1, render: { visible: false } },
  });
  World.add(world, mc);

  Events.on(mc, "startdrag", (e: any) => {
    items.find((i) => i.body === e.body)?.el.classList.add("is-grabbing");
  });
  Events.on(mc, "enddrag", (e: any) => {
    items.find((i) => i.body === e.body)?.el.classList.remove("is-grabbing");
  });

  function sync() {
    for (const it of items) {
      const { x, y } = it.body.position;
      const a = it.body.angle;
      it.el.style.transform = `translate(${x - it.w / 2}px, ${y - it.h / 2}px) rotate(${a}rad)`;
    }
    requestAnimationFrame(sync);
  }
  sync();

  window.addEventListener("resize", buildWalls);

  reset.addEventListener("click", () => {
    items.forEach((it, i) => {
      setTimeout(() => {
        const startX = Common.random(it.w / 2 + 20, window.innerWidth - it.w / 2 - 20);
        const startY = -200 - i * 140;
        Body.setPosition(it.body, { x: startX, y: startY });
        Body.setVelocity(it.body, { x: 0, y: 0 });
        Body.setAngularVelocity(it.body, 0);
        Body.setAngle(it.body, Common.random(-0.4, 0.4));
      }, i * 100);
    });
  });
}

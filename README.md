# Prasath H — Portfolio (unified site)

This is the single, continuous-scroll site that merges every section
(`Loader`, `Navigation`, `Hero`, `About` / `What I do`, `Projects`, `Skills`,
`Music area`, `Contact`, `Footer`) into one Vite + TypeScript project, so
Lenis smooth-scroll and GSAP ScrollTrigger animations work across the whole
page instead of breaking at folder boundaries.

## Run it

```
npm install
npm run dev
```

## Wire up the contact form

The form posts to [Formspree](https://formspree.io) (free, no backend):

1. Create a form at formspree.io, copy its form ID.
2. Create `.env.local` with `VITE_FORMSPREE_ID=your_id`.

Without it, the form shows an inline notice instead of failing silently.

## What still needs your input

- **Projects** (`src/sections/projects.ts`): populated from your GitHub repos,
  text-only (no cover images). Add an `<img>` back into `cardHtml()` if you
  want screenshots later.
- **Music** (`public/covers/*.jpg`): still the original demo's 30 generic
  cover images — swap these for art tied to your actual favorite tracks
  when you have them (same filenames, `image_0.jpg`…`image_29.jpg`).
- **LinkedIn/Instagram URLs**: guessed from your GitHub bio
  (`in/prasath2305`, `sarathi_prasath`) — double check they're exact.

## Structure

- `index.html` — every section in DOM order, one `<body>`.
- `src/main.ts` — single Lenis instance, GSAP/ScrollTrigger wiring, anchor
  smooth-scroll, preloader gate.
- `src/sections/*.ts` — one module per section, each exporting an `init...()`
  called from `main.ts`.
- `src/sections/*.css`, imported from `src/style.css`.

The original per-section folders (`Loader/`, `Navigation/`, etc.) are left
untouched as reference/backup.

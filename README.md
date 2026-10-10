# Calm World

Calm, offline walkthrough lessons and photo routines for school-age children with high support needs.
This repo is the **web prototype** from *Calm World: Refined Product Plan v1.1*: the reference
implementation that Phase 1 interviews and comprehension tests run on, on any tablet, today.
The Expo app ports its lesson data and step engine one-to-one.

- **Home menu**: opens on whichever child was last active, with just **Start** and **Parent settings**
- **Six lessons** on one shared engine: Colors, Washing hands, Brushing teeth, Entering the classroom,
  Grocery store, Asking for help or a break
- **Photo routines** built by a grown-up from 3 to 8 of their own photos, with three ways to move on:
  tap, choose what comes next, find the same picture
- **Per-child sensory profiles**, all defaulting to the quietest option, and swappable communication cards
  for the child's own AAC symbols
- **Break on every screen.** Next is never blocked. Nothing autoplays. Nothing celebrates.
- **Local only.** No accounts, no network requests, no analytics. JSON export and one-tap delete.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # engine + interaction-contract tests
npm run build      # static site in dist/, works from any host or sub-path
npm run preview    # serve the production build (service worker on, so it works offline after first load)
```

Parent settings sit behind a grown-up check that asks you to type a number from its word (for example "forty-seven" → `47`).
Three example profiles ship with the app: **Maple**, **River** and **Wren**, one per learner scenario.

## How it fits together

```
src/
  content/lessons.ts   Lessons as data: ordered steps, short versions, options
  engine.ts            One pure reducer for step, done, wrong and context. Returns effects
                       (log, speak, sound, exit) as data; never touches the DOM or storage
  symbols.ts           Inline-SVG drawing library (600×400), themed by CSS tokens
  state.ts             Profiles, routines, events, notes; localStorage; example seed data
  audio.ts             On-device speech and a generated soft water sound, only after a tap
  photos.ts            On-device resize (900 px routines, 360 px cards). Never uploaded
  app.ts               Renders the current view and routes actions through the engine
  views/child.ts       Home menu, Child Mode tiles, preview, steps, Break overlay, grown-up check
  views/adult.ts       Adult Mode: profile, activities, photo routines, notes, privacy & data
test/
  engine.test.ts       Lesson acceptance criteria against the pure engine
  contract.test.ts     The ten Child Mode rules against the rendered app (jsdom)
docs/
  interaction-contract.md
```

Steps are data, not code. A step has one of four types (`tap`, `choose`, `communicate` as `aac`, `next`),
a caption, an optional done-caption and a `draw(detail, ctx)` function. Photo routines are converted to the
same step shape (`routineSteps`), so every rule in the interaction contract applies to them too.

## Privacy

Everything stays in the browser on the device, under a nickname. Birth dates, real names, diagnoses,
location and voice recordings are never stored. Fonts (Atkinson Hyperlegible, Lexend, both OFL) are bundled,
so the built app makes no third-party requests. This is an educational practice tool, not therapy or a
diagnostic tool; a child-privacy review by qualified counsel is required before any release.

## Next

Per the plan's Sprint 2: Expo + TypeScript project with the same tokens, port `engine.ts` and its tests,
SQLite schema for profiles, routines, events and observations, then Washing hands and Asking for help first.

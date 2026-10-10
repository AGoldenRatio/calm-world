# Calm World

Calm, offline walkthrough lessons and photo routines for school-age children with high support needs.
This repo is the **web prototype** from *Calm World: Refined Product Plan v1.1*: the reference
implementation that Phase 1 interviews and comprehension tests run on, on any tablet, today.
The Expo app ports its lesson data and step engine one-to-one.

- **Home menu**: opens on whichever child was last active, with just **Start** and **Parent settings**
- **Seven activities** on one shared engine: Colors, Washing hands, Brushing teeth, Entering the classroom,
  Grocery store, Wood blocks, Asking for help or a break
- **Straight in, natural flow**: a tile opens the first step directly. Once the child has done a step it moves
  on by itself after a short pause (a grown-up can switch this to "Wait for Next"), and the end screen offers
  **Up next** to go straight to the following activity
- **Difficulty per activity**, set by a grown-up: Easy, Medium or Hard. Harder levels show more options, turn
  tap steps into "Which one is…?" questions, and set bigger tasks. Options are shuffled every time for variety
- **Grocery store simulation**: choose a quiet or busy store (when allowed), get a basket, read a picture
  shopping list, pick things off the shelf, put them on the checkout belt, pay with a card, bag them and leave.
  A list and basket panel shows what has been picked at every step
- **Wood blocks**: open the box, build a tower (Easy) or copy a picture of 3 or 5 colored blocks (Medium, Hard),
  then tidy up
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

Steps are data, not code. A step has one of five types (`tap`, `choose`, `collect`, `communicate` as `aac`, `next`).
`collect` steps take several taps in turn (items into a basket, blocks onto a tower). A step can have harder
`variants` and a `minLevel`, and a lesson can draw per-run content in `setup` (a shopping list, a block picture).
Each step has
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

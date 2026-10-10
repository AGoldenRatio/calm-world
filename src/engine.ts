/* The step engine: one pure reducer shared by built-in lessons and photo routines.
   It never touches the DOM, storage, audio or the clock. Side effects come back as data (Effect[])
   and the app decides what to do with them, which keeps every rule below unit-testable.

   Interaction contract rules enforced here:
   - Next is never blocked: 'next' always advances, whatever the step type and whether or not it was acted on.
   - Again resets the step without logging anything.
   - Speech and sound are only emitted in response to an action. */
import type { AacKey, Bg } from './symbols';
import type { Ctx, LessonCfg, Lesson, Level, Routine, Step, Text } from './types';

export type Phase = 'step' | 'complete';

export interface Run {
  kind: 'lesson' | 'routine';
  id: string;
  title: string;
  bg: Bg | null;
  steps: Step[];
  /** Current step index. Equal to steps.length on the completion screen. */
  i: number;
  phase: Phase;
  ctx: Ctx;
  /** Context as it was when each step was entered, so Again and Back undo that step's taps. */
  entry: Ctx[];
  /** The current step has been acted on. */
  done: boolean;
  /** The last tap that did not count, on a step that has a right answer. */
  wrong: string | null;
  /** The last tap that counted on a collect step. */
  last: string | null;
  /** Adult preview: nothing is logged. */
  preview: boolean;
  /** Teeth: show "With a grown-up" on assist steps. */
  assist: boolean;
  level: Level;
  /** Seed for this run's shuffles. Same seed, same options, so renders are stable. */
  seed: number;
}

export type Action =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'repeat' }
  | { type: 'tap' }
  | { type: 'pick'; value: string }
  | { type: 'aac'; value: AacKey }
  | { type: 'again' };

export type Effect =
  | { type: 'log'; event: 'started' | 'completed' | 'repeated' }
  | { type: 'speak'; text: string }
  | { type: 'sound'; cue: 'water' }
  /** Back from the first step: leave the activity. */
  | { type: 'exit' };

export interface Result {
  run: Run;
  effects: Effect[];
}

/* ---------- randomness (pure, seeded) ---------- */

/** mulberry32: a small seeded generator. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: readonly T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const hash = (s: string) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);

/* ---------- building runs ---------- */

/** A step as played at a difficulty: the highest variant at or below the level. */
export function atLevel(st: Step, level: Level): Step {
  let out = st;
  for (const l of [2, 3] as const) if (level >= l && st.variants?.[l]) out = { ...out, ...st.variants[l] };
  return out;
}

/** Steps a child will see: difficulty, hidden steps and options applied, lesson order kept. */
export function lessonSteps(lesson: Lesson, cfg?: LessonCfg): Step[] {
  const level = cfg?.level ?? 1;
  const keep = cfg?.steps;
  return lesson.steps
    .filter(st => {
      if (st.minLevel && level < st.minLevel) return false;
      if (st.requires === 'busy') return !!(lesson.busyOption && cfg?.opts.busy);
      if (lesson.id === 'teeth' && st.k === 'paste' && cfg?.opts.pasteHide) return false;
      return !keep || keep.includes(st.k);
    })
    .map(st => atLevel(st, level));
}

function makeRun(base: Omit<Run, 'i' | 'phase' | 'entry' | 'done' | 'wrong' | 'last'>): Run {
  const run: Run = { ...base, i: 0, phase: 'step', entry: [base.ctx], done: false, wrong: null, last: null };
  return { ...run, done: doneAtEntry(run) };
}

export interface RunOpts {
  preview?: boolean;
  seed?: number;
}

/** A lesson run starts on its first step. There is no separate preview screen. */
export function lessonRun(lesson: Lesson, cfg: LessonCfg | undefined, opts: RunOpts = {}): Run {
  const level = cfg?.level ?? 1;
  const seed = opts.seed ?? 1;
  const ctx: Ctx = { level, choice: null, mood: 'quiet', ...lesson.setup?.(level, rng(seed)) };
  return makeRun({
    kind: 'lesson', id: lesson.id, title: lesson.title, bg: lesson.bg, steps: lessonSteps(lesson, cfg), ctx,
    preview: !!opts.preview, assist: !!cfg?.opts.pasteAssist, level, seed,
  });
}

const photo = (img: string) => `<image href="${img.replace(/"/g, '%22')}" x="0" y="0" width="600" height="400" preserveAspectRatio="xMidYMid meet"/>`;

/** A photo routine as engine steps, using one of three ways to move on. */
export function routineSteps(r: Routine): Step[] {
  const n = r.steps.length;
  return r.steps.map((s, i): Step => {
    const base = { k: 'r' + i, title: 'Step ' + (i + 1), cap: s.cap || '', done: s.cap || '', img: s.img, draw: () => photo(s.img) };
    if (r.interaction === 'match' && n > 1) {
      const other = r.steps[(i + 1) % n].img;
      return { ...base, act: 'choose', cap: 'Find the same picture.', done: s.cap || 'Same picture.', target: 'self',
        photoOpts: { self: s.img, other }, pool: ['self', 'other'], optLabel: () => '', wrongCap: () => 'That one is different.' };
    }
    if (r.interaction === 'choose2' && i < n - 1) {
      const nextImg = r.steps[i + 1].img;
      const cand = r.steps[(i + 2) % n].img;
      const other = cand === s.img ? r.steps[0].img : cand;
      return { ...base, act: 'choose', cap: (s.cap ? s.cap + ' ' : '') + 'What comes next?', done: 'That comes next.', target: 'next',
        photoOpts: { next: nextImg, other }, pool: ['next', 'other'], optLabel: () => '', wrongCap: () => 'Look again.' };
    }
    return { ...base, act: 'tap', focal: null };
  });
}

export function routineRun(r: Routine, opts: RunOpts = {}): Run {
  return makeRun({ kind: 'routine', id: r.id, title: r.name, bg: null, steps: routineSteps(r), ctx: {},
    preview: !!opts.preview, assist: false, level: 1, seed: opts.seed ?? 1 });
}

/* ---------- reading a run ---------- */

const val = (v: Text | undefined, c: Ctx) => (typeof v === 'function' ? v(c) : v);

export const currentStep = (run: Run): Step | undefined => (run.phase === 'step' ? run.steps[run.i] : undefined);

/** The caption for the current state of a step. Feedback names what happened; it never scolds. */
export function captionFor(st: Step, run: Run): string {
  if (run.wrong != null && st.wrongCap) return st.wrongCap(run.wrong, run.ctx);
  if (run.done && st.done) return val(st.done, run.ctx) ?? '';
  if (run.last != null && st.pickedCap) return st.pickedCap(run.last, run.ctx);
  return val(st.cap, run.ctx) ?? '';
}

/** How many options a choose step shows: Easy 2, Medium 3, Hard 4. */
export const choicesAt = (level: Level) => level + 1;

/** Options for a choose step at a level: the target is always included, the rest are shuffled per run. */
export function choiceOptions(st: Step, level: Level, seed = 1): string[] {
  const rand = rng(seed ^ hash(st.k));
  const pool = st.pool ?? [];
  const n = Math.min(pool.length, choicesAt(level));
  const picked = st.target ? [st.target, ...shuffle(pool.filter(v => v !== st.target), rand).slice(0, n - 1)] : shuffle(pool, rand).slice(0, n);
  return shuffle(picked, rand);
}

/** What the child can tap on the current step. */
export function stepOptions(run: Run, st: Step): string[] {
  if (st.collect) return st.collect.options(run.ctx);
  return choiceOptions(st, run.level, run.seed + run.i * 101);
}

function doneAtEntry(run: Run): boolean {
  const st = run.steps[run.i];
  return !!st?.collect && st.collect.goal(run.ctx) <= st.collect.count(run.ctx);
}

/* ---------- the reducer ---------- */

function speakEffect(run: Run): Effect[] {
  const st = currentStep(run);
  if (!st) return [];
  const text = captionFor(st, run);
  return text ? [{ type: 'speak', text }] : [];
}

function goStep(run: Run, i: number): Result {
  if (i >= run.steps.length) {
    return { run: { ...run, i: run.steps.length, phase: 'complete', done: false, wrong: null, last: null }, effects: [{ type: 'log', event: 'completed' }] };
  }
  // Going back restores the context from when that step was entered; going forward records it.
  const ctx = i < run.i ? run.entry[i] : run.ctx;
  const entry = [...run.entry.slice(0, i), ctx];
  const next: Run = { ...run, i, phase: 'step', ctx, entry, done: false, wrong: null, last: null };
  next.done = doneAtEntry(next);
  return { run: next, effects: speakEffect(next) };
}

/** Effects for a run that has just been opened: log and read the first step. */
export function startEffects(run: Run): Effect[] {
  return [{ type: 'log', event: 'started' }, ...speakEffect(run)];
}

export function reduce(run: Run, action: Action): Result {
  const st = currentStep(run);
  switch (action.type) {
    case 'next':
      if (run.phase !== 'step') return { run, effects: [] };
      return goStep(run, run.i + 1);
    case 'back':
      if (run.phase !== 'step') return { run, effects: [] };
      if (run.i === 0) return { run, effects: [{ type: 'exit' }] };
      return goStep(run, run.i - 1);
    case 'repeat': {
      if (!st) return { run, effects: [] };
      const next: Run = { ...run, ctx: run.entry[run.i], done: false, wrong: null, last: null };
      next.done = doneAtEntry(next);
      return { run: next, effects: speakEffect(next) };
    }
    case 'tap': {
      if (!st || st.act !== 'tap' || run.done) return { run, effects: [] };
      const next = { ...run, done: true };
      const effects: Effect[] = st.sound ? [{ type: 'sound', cue: st.sound }] : [];
      return { run: next, effects: [...effects, ...speakEffect(next)] };
    }
    case 'pick': {
      if (!st) return { run, effects: [] };
      if (st.act === 'collect' && st.collect) {
        if (run.done) return { run, effects: [] };
        const col = st.collect;
        if (!col.accept(action.value, run.ctx)) {
          const next = { ...run, wrong: action.value };
          return { run: next, effects: speakEffect(next) };
        }
        const ctx = col.add(run.ctx, action.value);
        const next = { ...run, ctx, wrong: null, last: action.value, done: col.count(ctx) >= col.goal(ctx) };
        return { run: next, effects: speakEffect(next) };
      }
      if (st.act !== 'choose') return { run, effects: [] };
      if (st.target && action.value !== st.target) {
        const next = { ...run, wrong: action.value, done: false };
        return { run: next, effects: speakEffect(next) };
      }
      const ctx = st.store ? { ...run.ctx, [st.store]: action.value } : run.ctx;
      const next = { ...run, ctx, wrong: null, last: action.value, done: true };
      return { run: next, effects: speakEffect(next) };
    }
    case 'aac': {
      if (!st || st.act !== 'aac') return { run, effects: [] };
      const next = { ...run, ctx: { ...run.ctx, choice: action.value }, done: true };
      return { run: next, effects: speakEffect(next) };
    }
    case 'again': {
      if (run.phase !== 'complete') return { run, effects: [] };
      const fresh: Run = { ...run, i: 0, phase: 'step', ctx: run.entry[0], entry: [run.entry[0]], done: false, wrong: null, last: null };
      fresh.done = doneAtEntry(fresh);
      return { run: fresh, effects: [{ type: 'log', event: 'repeated' }, ...speakEffect(fresh)] };
    }
  }
}

/** Should the app move on by itself? Only right after the child acted and the step is complete. */
export function shouldAutoAdvance(before: Run, after: Run, action: Action): boolean {
  if (after.phase !== 'step' || !after.done || before.done) return false;
  if (!['tap', 'pick', 'aac'].includes(action.type)) return false;
  return currentStep(after)?.act !== 'next';
}

/** Drive a run with a list of actions; returns the final run and every effect in order. */
export function play(run: Run, actions: Action[]): Result {
  const effects: Effect[] = [];
  for (const a of actions) {
    const res = reduce(run, a);
    run = res.run;
    effects.push(...res.effects);
  }
  return { run, effects };
}

/* The step engine: one pure reducer shared by built-in lessons and photo routines.
   It never touches the DOM, storage or audio. Side effects come back as data (Effect[])
   and the app decides what to do with them, which keeps every rule below unit-testable.

   Interaction contract rules enforced here:
   - Next is never blocked: 'next' always advances, whatever the step type and whether or not it was acted on.
   - Again resets the step and logs nothing.
   - Nothing starts on its own: speech and sound are only emitted in response to an action. */
import type { AacKey, Bg } from './symbols';
import type { Ctx, LessonCfg, Lesson, Routine, Step, Text } from './types';

export type Phase = 'preview' | 'step' | 'complete' | 'finished';

export interface Run {
  kind: 'lesson' | 'routine';
  id: string;
  title: string;
  bg: Bg | null;
  steps: Step[];
  /** Current step index. -1 while on the preview screen. */
  i: number;
  phase: Phase;
  ctx: Ctx;
  /** The current step has been acted on. */
  done: boolean;
  /** The last pick on a choose step that has a target, when it was a different one. */
  wrong: string | null;
  /** Adult preview: nothing is logged. */
  preview: boolean;
  /** Grocery: the adult allowed the busy store, so the child may choose it. */
  busyOption: boolean;
  /** Teeth: show "With a grown-up" on assist steps. */
  assist: boolean;
}

export type Action =
  | { type: 'start' }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'repeat' }
  | { type: 'tap' }
  | { type: 'pick'; value: string }
  | { type: 'aac'; value: AacKey }
  | { type: 'again' }
  | { type: 'finish' }
  | { type: 'setBusy'; busy: boolean };

export type Effect =
  | { type: 'log'; event: 'started' | 'completed' | 'repeated' }
  | { type: 'speak'; text: string }
  | { type: 'sound'; cue: 'water' }
  /** Back from the preview screen: leave the activity. */
  | { type: 'exit' };

export interface Result {
  run: Run;
  effects: Effect[];
}

/* ---------- building runs ---------- */

/** Steps a child will see for a lesson: hidden steps and options removed, lesson order kept. */
export function lessonSteps(lesson: Lesson, cfg?: LessonCfg): Step[] {
  const keep = cfg?.steps;
  return lesson.steps.filter(st => {
    if (lesson.id === 'teeth' && st.k === 'paste' && cfg?.opts.pasteHide) return false;
    return !keep || keep.includes(st.k);
  });
}

export function lessonRun(lesson: Lesson, cfg: LessonCfg | undefined, preview = false): Run {
  return {
    kind: 'lesson', id: lesson.id, title: lesson.title, bg: lesson.bg,
    steps: lessonSteps(lesson, cfg), i: -1, phase: 'preview',
    ctx: { item: 'apple', choice: null, busy: false }, done: false, wrong: null, preview,
    busyOption: !!(lesson.busyOption && cfg?.opts.busy), assist: !!cfg?.opts.pasteAssist,
  };
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
        photoOpts: { self: s.img, other }, pool: ['self', 'other'], rot: i, optLabel: () => '', wrongCap: () => 'That one is different.' };
    }
    if (r.interaction === 'choose2' && i < n - 1) {
      const nextImg = r.steps[i + 1].img;
      const cand = r.steps[(i + 2) % n].img;
      const other = cand === s.img ? r.steps[0].img : cand;
      return { ...base, act: 'choose', cap: (s.cap ? s.cap + ' ' : '') + 'What comes next?', done: 'That comes next.', target: 'next',
        photoOpts: { next: nextImg, other }, pool: ['next', 'other'], rot: i, optLabel: () => '', wrongCap: () => 'Look again.' };
    }
    return { ...base, act: 'tap', focal: null };
  });
}

export function routineRun(r: Routine, preview = false): Run {
  return { kind: 'routine', id: r.id, title: r.name, bg: null, steps: routineSteps(r), i: -1, phase: 'preview',
    ctx: {}, done: false, wrong: null, preview, busyOption: false, assist: false };
}

/* ---------- reading a run ---------- */

const val = (v: Text | undefined, c: Ctx) => (typeof v === 'function' ? v(c) : v);

export const currentStep = (run: Run): Step | undefined => run.steps[run.i];

/** The caption for the current state of a step. Feedback names what happened; it never scolds. */
export function captionFor(st: Step, run: Run): string {
  if (run.wrong && st.wrongCap) return st.wrongCap(run.wrong);
  if (run.done && st.done) return val(st.done, run.ctx) ?? '';
  return val(st.cap, run.ctx) ?? '';
}

/** Options shown on a choose step for a given "choices at once" setting. The target is always included. */
export function choiceOptions(st: Step, choices: number): string[] {
  let pool = st.pool ?? [];
  if (st.target) {
    const others = pool.filter(v => v !== st.target).slice(0, Math.max(1, choices - 1));
    pool = [st.target, ...others];
  } else {
    pool = pool.slice(0, Math.max(2, choices));
  }
  const k = (st.rot || 0) % pool.length;
  return [...pool.slice(k), ...pool.slice(0, k)];
}

/* ---------- the reducer ---------- */

function speakEffect(run: Run): Effect[] {
  const st = currentStep(run);
  if (run.phase !== 'step' || !st) return [];
  const text = captionFor(st, run);
  return text ? [{ type: 'speak', text }] : [];
}

function goStep(run: Run, i: number): Result {
  const r: Run = { ...run, i, done: false, wrong: null };
  if (i >= r.steps.length) return { run: { ...r, i: r.steps.length, phase: 'complete' }, effects: [{ type: 'log', event: 'completed' }] };
  if (i < 0) return { run: { ...r, i: -1, phase: 'preview' }, effects: [] };
  const next = { ...r, phase: 'step' as const };
  return { run: next, effects: speakEffect(next) };
}

export function reduce(run: Run, action: Action): Result {
  const st = currentStep(run);
  switch (action.type) {
    case 'start': {
      const res = goStep(run, 0);
      return { run: res.run, effects: [{ type: 'log', event: 'started' }, ...res.effects] };
    }
    case 'next':
      if (run.phase === 'preview') return reduce(run, { type: 'start' });
      if (run.phase !== 'step') return { run, effects: [] };
      return goStep(run, run.i + 1);
    case 'back':
      if (run.phase === 'preview') return { run, effects: [{ type: 'exit' }] };
      if (run.phase !== 'step') return { run, effects: [] };
      return goStep(run, run.i - 1);
    case 'repeat': {
      if (run.phase !== 'step' || !st) return { run, effects: [] };
      const ctx = { ...run.ctx };
      if (st.store === 'item') ctx.item = 'apple';
      if (st.store === 'choice') ctx.choice = null;
      const next = { ...run, ctx, done: false, wrong: null };
      return { run: next, effects: speakEffect(next) };
    }
    case 'tap': {
      if (run.phase !== 'step' || !st || st.act !== 'tap' || run.done) return { run, effects: [] };
      const next = { ...run, done: true };
      const effects: Effect[] = st.sound ? [{ type: 'sound', cue: st.sound }] : [];
      return { run: next, effects: [...effects, ...speakEffect(next)] };
    }
    case 'pick': {
      if (run.phase !== 'step' || !st || st.act !== 'choose') return { run, effects: [] };
      if (st.target && action.value !== st.target) {
        const next = { ...run, wrong: action.value, done: false };
        return { run: next, effects: speakEffect(next) };
      }
      const ctx = st.store ? { ...run.ctx, [st.store]: action.value } : run.ctx;
      const next = { ...run, ctx, wrong: null, done: true };
      return { run: next, effects: speakEffect(next) };
    }
    case 'aac': {
      if (run.phase !== 'step' || !st || st.act !== 'aac') return { run, effects: [] };
      const next = { ...run, ctx: { ...run.ctx, choice: action.value }, done: true };
      return { run: next, effects: speakEffect(next) };
    }
    case 'again': {
      if (run.phase !== 'complete') return { run, effects: [] };
      const res = goStep(run, 0);
      return { run: res.run, effects: [{ type: 'log', event: 'repeated' }, ...res.effects] };
    }
    case 'finish':
      if (run.phase !== 'complete') return { run, effects: [] };
      return { run: { ...run, phase: 'finished' }, effects: [] };
    case 'setBusy':
      if (run.phase !== 'preview' || !run.busyOption) return { run, effects: [] };
      return { run: { ...run, ctx: { ...run.ctx, busy: action.busy } }, effects: [] };
  }
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

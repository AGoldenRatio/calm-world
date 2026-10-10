/* Lesson acceptance criteria from the product plan, checked against the pure step engine. */
import { describe, expect, it } from 'vitest';
import { ASK_ANY_TIME, ITEMS, LESSONS, lessonById } from '../src/content/lessons';
import {
  captionFor, choiceOptions, currentStep, lessonRun, play, reduce, routineRun, shouldAutoAdvance, startEffects, stepOptions,
  type Action, type Run,
} from '../src/engine';
import { lessonConfig } from '../src/state';
import type { Detail } from '../src/symbols';
import type { LessonCfg, Level, Routine } from '../src/types';

const cfgFor = (id: string, over: Partial<LessonCfg> = {}): LessonCfg => ({ ...lessonConfig().find(c => c.id === id)!, ...over });
const nexts = (n: number): Action[] => Array.from({ length: n }, () => ({ type: 'next' }) as Action);
const keys = (run: Run) => run.steps.map(s => s.k);
const run = (id: string, over: Partial<LessonCfg> = {}, seed = 1) => lessonRun(lessonById(id)!, cfgFor(id, over), { seed });
const goTo = (r: Run, k: string) => {
  while (r.phase === 'step' && currentStep(r)!.k !== k) r = reduce(r, { type: 'next' }).run;
  return r;
};
const LEVELS: Level[] = [1, 2, 3];

describe.each(LESSONS.map(l => [l.title, l] as const))('%s', (_title, lesson) => {
  it.each(LEVELS)('opens on the first step and completes using only Next (level %i)', level => {
    const r = run(lesson.id, { level });
    expect(r.phase).toBe('step');
    expect(r.i).toBe(0);
    expect(startEffects(r)[0]).toEqual({ type: 'log', event: 'started' });
    const { run: end, effects } = play(r, nexts(r.steps.length));
    expect(end.phase).toBe('complete');
    expect(effects.filter(e => e.type === 'log')).toEqual([{ type: 'log', event: 'completed' }]);
  });

  it.each(LEVELS)('every step has a caption and draws at all three detail levels (level %i)', level => {
    let r = run(lesson.id, { level });
    while (r.phase === 'step') {
      const st = currentStep(r)!;
      expect(captionFor(st, r).length).toBeGreaterThan(0);
      for (const d of [0, 1, 2] as Detail[]) {
        expect(st.draw(d, { ...r.ctx, done: false })).toMatch(/^</);
        expect(st.draw(d, { ...r.ctx, done: true })).toMatch(/^</);
      }
      if (st.act === 'choose' || st.act === 'collect') for (const v of stepOptions(r, st)) expect(st.optDraw!(v)).toMatch(/^</);
      r = reduce(r, { type: 'next' }).run;
    }
  });

  it('Again resets the step without logging anything', () => {
    let r = run(lesson.id);
    const st = currentStep(r)!;
    if (st.act === 'tap') r = reduce(r, { type: 'tap' }).run;
    const res = reduce(r, { type: 'repeat' });
    expect(res.run.done).toBe(false);
    expect(res.run.i).toBe(r.i);
    expect(res.effects.some(e => e.type === 'log')).toBe(false);
  });

  it('Back from the first step leaves the activity', () => {
    expect(reduce(run(lesson.id), { type: 'back' }).effects).toEqual([{ type: 'exit' }]);
  });

  if (lesson.short) {
    it('the short version plays its steps in lesson order', () => {
      const r = run(lesson.id, { steps: [...lesson.short!], level: 3 });
      expect(keys(r)).toEqual(lesson.steps.map(s => s.k).filter(k => lesson.short!.includes(k)));
    });
  }

  it('individually hidden steps are skipped and the rest keep their order', () => {
    const visible = lesson.steps.filter(s => !s.minLevel && !s.requires).map(s => s.k);
    const hidden = visible[1];
    const keep = visible.filter(k => k !== hidden);
    expect(keys(run(lesson.id, { steps: keep }))).toEqual(keep);
  });
});

describe('Next is never blocked', () => {
  it('advances from every step at every level without a response', () => {
    for (const lesson of LESSONS) for (const level of LEVELS) {
      let r = run(lesson.id, { level });
      for (let i = 0; i < r.steps.length; i++) {
        expect(r.i).toBe(i);
        r = reduce(r, { type: 'next' }).run;
      }
      expect(r.phase).toBe('complete');
    }
  });

  it('advances after a different pick', () => {
    const r = play(run('colors', { steps: ['find-red'] }), [{ type: 'pick', value: 'blue' }]).run;
    expect(r.wrong).toBe('blue');
    expect(reduce(r, { type: 'next' }).run.phase).toBe('complete');
  });
});

describe('Moving on by itself', () => {
  it('only right after the child completes a step', () => {
    const r = run('hands');
    const tapped = reduce(r, { type: 'tap' }).run;
    expect(shouldAutoAdvance(r, tapped, { type: 'tap' })).toBe(true);
    expect(shouldAutoAdvance(r, reduce(r, { type: 'next' }).run, { type: 'next' })).toBe(false);
    expect(shouldAutoAdvance(tapped, reduce(tapped, { type: 'repeat' }).run, { type: 'repeat' })).toBe(false);
  });

  it('not after a different pick', () => {
    const r = run('colors', { steps: ['find-red'] });
    expect(shouldAutoAdvance(r, reduce(r, { type: 'pick', value: 'blue' }).run, { type: 'pick', value: 'blue' })).toBe(false);
  });

  it('not until a collect step is finished', () => {
    const r = goTo(run('blocks'), 'build');
    const one = reduce(r, { type: 'pick', value: 'red' }).run;
    expect(shouldAutoAdvance(r, one, { type: 'pick', value: 'red' })).toBe(false);
    const two = reduce(one, { type: 'pick', value: 'red' }).run;
    const three = reduce(two, { type: 'pick', value: 'blue' }).run;
    expect(shouldAutoAdvance(two, three, { type: 'pick', value: 'blue' })).toBe(true);
  });
});

describe('Difficulty', () => {
  const find = lessonById('colors')!.steps.find(s => s.k === 'find-red')!;

  it.each([[1, 2], [2, 3], [3, 4]] as const)('level %i shows %i options, always including the target', (level, n) => {
    const opts = choiceOptions(find, level);
    expect(opts).toHaveLength(n);
    expect(opts).toContain('red');
  });

  it('shuffles options differently between runs', () => {
    const orders = new Set(Array.from({ length: 12 }, (_, s) => choiceOptions(find, 3, s).join()));
    expect(orders.size).toBeGreaterThan(1);
  });

  it('keeps options stable within a run', () => {
    const r = run('colors', { steps: ['find-red'], level: 3 }, 42);
    const st = currentStep(r)!;
    expect(stepOptions(r, st)).toEqual(stepOptions(r, st));
  });

  it('turns tap steps into "Which one is…?" questions at higher levels', () => {
    expect(currentStep(goTo(run('hands', { level: 1 }), 'soap'))!.act).toBe('tap');
    const medium = goTo(run('hands', { level: 2 }), 'soap');
    expect(currentStep(medium)!.act).toBe('choose');
    expect(captionFor(currentStep(medium)!, medium)).toBe('Which one is the soap?');
    expect(currentStep(goTo(run('hands', { level: 2 }), 'dry'))!.act).toBe('tap');
    expect(currentStep(goTo(run('hands', { level: 3 }), 'dry'))!.act).toBe('choose');
    expect(currentStep(goTo(run('teeth', { level: 2 }), 'find'))!.target).toBe('brush');
    expect(currentStep(goTo(run('classroom', { level: 2 }), 'space'))!.target).toBe('star');
  });

  it('adds the color hunt only at Hard', () => {
    expect(keys(run('colors', { level: 2 }))).not.toContain('find-all');
    expect(keys(run('colors', { level: 3 }))).toContain('find-all');
  });

  it('every lesson but Asking for help describes its three levels', () => {
    for (const l of LESSONS) expect(l.levels?.length ?? 0).toBe(l.id === 'help' ? 0 : 3);
  });
});

describe('Feedback names what happened', () => {
  it('a different pick says what it is, and the target is not marked done', () => {
    const r = play(run('colors', { steps: ['find-red'] }), [{ type: 'pick', value: 'blue' }]).run;
    expect(captionFor(currentStep(r)!, r)).toBe('That is blue.');
    expect(r.done).toBe(false);
    const right = reduce(r, { type: 'pick', value: 'red' }).run;
    expect(right.done).toBe(true);
    expect(captionFor(currentStep(right)!, right)).toBe('That is red.');
  });
});

describe('Color hunt (Hard)', () => {
  it('counts only things of the hunted color, once each', () => {
    const r = goTo(run('colors', { level: 3 }, 7), 'find-all');
    const st = currentStep(r)!;
    const things = stepOptions(r, st);
    expect(things).toHaveLength(6);
    const hunt = r.ctx.hunt!;
    const wrong = things.find(v => !v.startsWith(hunt) && !(hunt === 'red' && v === 'apple') && !(hunt === 'yellow' && v === 'banana'))!;
    const miss = reduce(r, { type: 'pick', value: wrong }).run;
    expect(miss.wrong).toBe(wrong);
    expect(captionFor(st, miss)).toMatch(/^The \w+ is \w+\.$/);
    const targets = things.filter(v => st.collect!.accept(v, r.ctx));
    const end = play(r, targets.map(value => ({ type: 'pick', value }) as Action)).run;
    expect(end.done).toBe(true);
    expect(captionFor(st, end)).toBe(`You found all the ${hunt} things.`);
  });
});

describe('Grocery store simulation', () => {
  it('Easy: any one thing from 3 on the shelf, no list', () => {
    const r = goTo(run('grocery', { level: 1 }), 'shop');
    expect(keys(r)).not.toContain('list');
    expect(r.ctx.list).toEqual([]);
    const shelf = stepOptions(r, currentStep(r)!);
    expect(shelf).toHaveLength(3);
    const res = reduce(r, { type: 'pick', value: shelf[1] });
    expect(res.run.ctx.basket).toEqual([shelf[1]]);
    expect(res.run.done).toBe(true);
    expect(captionFor(currentStep(res.run)!, res.run)).toBe(`You chose the ${ITEMS[shelf[1]].name}.`);
  });

  it.each([[2, 4, 2], [3, 6, 3]] as const)('level %i: %i on the shelf, %i on the list', (level, shelfN, listN) => {
    const r = goTo(run('grocery', { level }, 3), 'shop');
    expect(r.ctx.shelf).toHaveLength(shelfN);
    expect(r.ctx.list).toHaveLength(listN);
    for (const v of r.ctx.list!) expect(r.ctx.shelf).toContain(v);
  });

  it('shows what was picked: the basket fills, with a caption for each pick, and gently refuses others', () => {
    let r = goTo(run('grocery', { level: 2 }, 5), 'shop');
    const st = currentStep(r)!;
    const [a, b] = r.ctx.list!;
    const off = r.ctx.shelf!.find(v => !r.ctx.list!.includes(v))!;

    r = reduce(r, { type: 'pick', value: off }).run;
    expect(captionFor(st, r)).toMatch(/not on your list\.$/);
    expect(r.ctx.basket).toEqual([]);

    r = reduce(r, { type: 'pick', value: a }).run;
    expect(r.ctx.basket).toEqual([a]);
    expect(r.last).toBe(a);
    expect(captionFor(st, r)).toMatch(/in your basket\.$/);
    expect(r.done).toBe(false);

    r = reduce(r, { type: 'pick', value: a }).run;
    expect(captionFor(st, r)).toMatch(/already in your basket\.$/);

    r = reduce(r, { type: 'pick', value: b }).run;
    expect(r.ctx.basket).toEqual([a, b]);
    expect(r.done).toBe(true);
    expect(captionFor(st, r)).toBe('You found everything on your list.');

    const hud = lessonById('grocery')!.hud!(r.ctx, r.last);
    expect(hud).toContain('Basket');
    expect(hud).toContain(ITEMS[a].name);
    expect(hud).toContain(ITEMS[b].name);
  });

  it('runs through checkout: belt, pay, bag, leave', () => {
    let r = goTo(run('grocery', { level: 2 }, 5), 'shop');
    for (const value of r.ctx.list!) r = reduce(r, { type: 'pick', value }).run;
    r = reduce(r, { type: 'next' }).run;
    expect(currentStep(r)!.k).toBe('belt');
    expect(stepOptions(r, currentStep(r)!)).toEqual(r.ctx.basket);
    for (const value of r.ctx.basket!) r = reduce(r, { type: 'pick', value }).run;
    expect(r.done).toBe(true);
    expect(r.ctx.belt).toEqual(r.ctx.basket);
    r = play(r, nexts(1)).run;
    expect(keys(r).slice(r.i)).toEqual(['pay', 'bag', 'leave']);
  });

  it('Again on the shelf empties the basket again', () => {
    let r = goTo(run('grocery', { level: 1 }), 'shop');
    r = reduce(r, { type: 'pick', value: r.ctx.shelf![0] }).run;
    r = reduce(r, { type: 'repeat' }).run;
    expect(r.ctx.basket).toEqual([]);
    expect(r.done).toBe(false);
  });

  it('Back undoes the later step: returning to the shelf restores the basket from when you arrived', () => {
    let r = goTo(run('grocery', { level: 1 }), 'shop');
    r = reduce(r, { type: 'pick', value: r.ctx.shelf![0] }).run;
    r = reduce(r, { type: 'next' }).run;
    r = reduce(r, { type: 'back' }).run;
    expect(currentStep(r)!.k).toBe('shop');
    expect(r.ctx.basket).toEqual([]);
  });

  it('the busy store is the child\'s choice, and only offered when the adult allowed it', () => {
    expect(keys(run('grocery', { opts: { busy: false } }))).not.toContain('mood');
    const r = run('grocery', { opts: { busy: true } });
    expect(currentStep(r)!.k).toBe('mood');
    expect(r.ctx.mood).toBe('quiet');
    expect(reduce(r, { type: 'pick', value: 'busy' }).run.ctx.mood).toBe('busy');
    expect(keys(run('grocery', { opts: { busy: true }, steps: ['shop'] }))).toEqual(['mood', 'shop']);
  });
});

describe('Wood blocks', () => {
  it('Easy: any 3 blocks build a tower', () => {
    let r = goTo(run('blocks', { level: 1 }), 'build');
    expect(r.ctx.pattern).toEqual([]);
    for (const value of ['wood', 'blue', 'wood']) r = reduce(r, { type: 'pick', value }).run;
    expect(r.ctx.tower).toEqual(['wood', 'blue', 'wood']);
    expect(r.done).toBe(true);
    expect(captionFor(currentStep(r)!, r)).toBe('You built a tower.');
  });

  it.each([[2, 3, 3], [3, 5, 4]] as const)('level %i: copy a picture of %i blocks in up to %i colors', (level, size, colors) => {
    let r = goTo(run('blocks', { level }, 9), 'build');
    const st = currentStep(r)!;
    expect(r.ctx.pattern).toHaveLength(size);
    expect(stepOptions(r, st)).toHaveLength(colors);
    const want = r.ctx.pattern![0];
    const other = stepOptions(r, st).find(v => v !== want)!;
    r = reduce(r, { type: 'pick', value: other }).run;
    expect(captionFor(st, r)).toBe(`That is ${other}. The picture shows ${want}.`);
    expect(r.ctx.tower).toEqual([]);
    for (const value of r.ctx.pattern!) r = reduce(r, { type: 'pick', value }).run;
    expect(r.ctx.tower).toEqual(r.ctx.pattern);
    expect(r.done).toBe(true);
    expect(lessonById('blocks')!.hud!(r.ctx, r.last)).toContain('Make this');
  });
});

describe('Asking for help or a break', () => {
  const honored = { help: 'A grown-up helps.', break: 'You take a break.', no: 'Okay. No puzzle.', done: 'All done. The puzzle goes away.' } as const;

  it.each(Object.entries(honored))('choosing %s leads to a scene where it is honored', (k, text) => {
    const r = play(run('help'), [{ type: 'next' }, { type: 'aac', value: k as keyof typeof honored }, { type: 'next' }]).run;
    expect(currentStep(r)!.k).toBe('respond');
    expect(captionFor(currentStep(r)!, r)).toBe(text);
  });

  it('skipping the choice with Next shows "You can ask any time." and nothing else', () => {
    const r = play(run('help'), nexts(2)).run;
    expect(captionFor(currentStep(r)!, r)).toBe(ASK_ANY_TIME);
  });
});

describe('Lesson options', () => {
  it('the toothpaste step can be hidden', () => {
    expect(keys(run('teeth', { opts: { pasteHide: true } }))).not.toContain('paste');
  });

  it('only sound-cued steps ask for the water sound, and only after a tap', () => {
    const r = goTo(run('hands'), 'water');
    expect(reduce(r, { type: 'tap' }).effects).toContainEqual({ type: 'sound', cue: 'water' });
    expect(reduce(run('hands'), { type: 'tap' }).effects.some(e => e.type === 'sound')).toBe(false);
  });
});

describe('Completion', () => {
  it('Again from the end logs "did it again" and restarts at step one with a fresh context', () => {
    let r = goTo(run('blocks', { level: 1 }), 'build');
    for (const value of ['red', 'red', 'red']) r = reduce(r, { type: 'pick', value }).run;
    const done = play(r, nexts(5)).run;
    expect(done.phase).toBe('complete');
    const res = reduce(done, { type: 'again' });
    expect(res.run.i).toBe(0);
    expect(res.run.ctx.tower).toEqual([]);
    expect(res.effects[0]).toEqual({ type: 'log', event: 'repeated' });
  });
});

describe('Photo routines run on the same engine', () => {
  const img = (n: number) => `data:image/svg+xml,${n}`;
  const routine = (interaction: Routine['interaction'], n = 4): Routine => ({
    id: 'r1', pid: 'p1', name: 'Drop-off', on: true, interaction,
    steps: Array.from({ length: n }, (_, i) => ({ img: img(i), cap: `Step ${i + 1}.` })),
  });

  it('tap to continue: every step is a tap step and completes with Next', () => {
    const r = routineRun(routine('tap'));
    expect(r.steps.every(s => s.act === 'tap')).toBe(true);
    expect(play(r, nexts(4)).run.phase).toBe('complete');
  });

  it('find the same picture: the target is the step\'s own photo, shown with one other', () => {
    const r = routineRun(routine('match'));
    for (const st of r.steps) {
      expect(st.photoOpts!.self).toBe(st.img);
      expect(st.photoOpts!.other).not.toBe(st.img);
    }
    expect(stepOptions(r, r.steps[0]).sort()).toEqual(['other', 'self']);
  });

  it('choose what comes next: the right option is the next photo, and the last step is a tap', () => {
    const rt = routine('choose2');
    const r = routineRun(rt);
    r.steps.slice(0, -1).forEach((st, i) => expect(st.photoOpts!.next).toBe(rt.steps[i + 1].img));
    expect(r.steps.at(-1)!.act).toBe('tap');
  });
});

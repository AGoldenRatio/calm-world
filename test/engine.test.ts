/* Lesson acceptance criteria from the product plan, checked against the pure step engine. */
import { describe, expect, it } from 'vitest';
import { ASK_ANY_TIME, LESSONS, lessonById } from '../src/content/lessons';
import { captionFor, choiceOptions, currentStep, lessonRun, play, reduce, routineRun, type Action, type Run } from '../src/engine';
import { lessonConfig } from '../src/state';
import type { Detail } from '../src/symbols';
import type { LessonCfg, Routine } from '../src/types';

const cfgFor = (id: string, over: Partial<LessonCfg> = {}): LessonCfg => ({ ...lessonConfig().find(c => c.id === id)!, ...over });
const nexts = (n: number): Action[] => Array.from({ length: n }, () => ({ type: 'next' }) as Action);
const keys = (run: Run) => run.steps.map(s => s.k);

describe.each(LESSONS.map(l => [l.title, l] as const))('%s', (_title, lesson) => {
  const fresh = () => lessonRun(lesson, cfgFor(lesson.id));

  it('completes start to finish using only Next, with no taps on the picture', () => {
    const run = fresh();
    const { run: end, effects } = play(run, nexts(run.steps.length + 1));
    expect(end.phase).toBe('complete');
    expect(effects.filter(e => e.type === 'log').map(e => (e as { event: string }).event)).toEqual(['started', 'completed']);
  });

  it('every step has a caption and a drawing at all three detail levels', () => {
    let run = reduce(fresh(), { type: 'start' }).run;
    while (run.phase === 'step') {
      const st = currentStep(run)!;
      expect(captionFor(st, run).length).toBeGreaterThan(0);
      for (const d of [0, 1, 2] as Detail[]) {
        expect(st.draw(d, { ...run.ctx, done: false })).toMatch(/^</);
        expect(st.draw(d, { ...run.ctx, done: true })).toMatch(/^</);
      }
      run = reduce(run, { type: 'next' }).run;
    }
  });

  it('Again resets the step without logging anything', () => {
    let run = play(fresh(), [{ type: 'start' }]).run;
    const st = currentStep(run)!;
    if (st.act === 'tap') run = reduce(run, { type: 'tap' }).run;
    const res = reduce(run, { type: 'repeat' });
    expect(res.run.done).toBe(false);
    expect(res.run.wrong).toBeNull();
    expect(res.run.i).toBe(run.i);
    expect(res.effects.some(e => e.type === 'log')).toBe(false);
  });

  it('opens on the preview screen, and Back from there leaves the activity', () => {
    const run = fresh();
    expect(run.phase).toBe('preview');
    expect(reduce(run, { type: 'back' }).effects).toEqual([{ type: 'exit' }]);
  });

  if (lesson.short) {
    it('the short version plays its steps in lesson order', () => {
      const run = lessonRun(lesson, cfgFor(lesson.id, { steps: [...lesson.short!] }));
      expect(keys(run)).toEqual(lesson.steps.map(s => s.k).filter(k => lesson.short!.includes(k)));
      const end = play(run, nexts(run.steps.length + 1)).run;
      expect(end.phase).toBe('complete');
    });
  }

  it('individually hidden steps are skipped and the rest keep their order', () => {
    if (lesson.steps.length < 2) return;
    const hidden = lesson.steps[1].k;
    const visible = lesson.steps.map(s => s.k).filter(k => k !== hidden);
    const run = lessonRun(lesson, cfgFor(lesson.id, { steps: visible }));
    expect(keys(run)).toEqual(visible);
  });
});

describe('Next is never blocked', () => {
  it('advances from every step type without a response', () => {
    for (const lesson of LESSONS) {
      let run = reduce(lessonRun(lesson, cfgFor(lesson.id)), { type: 'start' }).run;
      for (let i = 0; i < lesson.steps.length; i++) {
        expect(run.i).toBe(i);
        expect(run.done).toBe(false);
        run = reduce(run, { type: 'next' }).run;
      }
      expect(run.phase).toBe('complete');
    }
  });

  it('advances after a different pick on a choose step', () => {
    const colors = lessonById('colors')!;
    const run = lessonRun(colors, cfgFor('colors', { steps: ['find-red'] }));
    const afterWrong = play(run, [{ type: 'start' }, { type: 'pick', value: 'blue' }]).run;
    expect(afterWrong.wrong).toBe('blue');
    expect(reduce(afterWrong, { type: 'next' }).run.phase).toBe('complete');
  });
});

describe('Feedback names what happened', () => {
  it('a different pick says what it is, and the target is not marked done', () => {
    const colors = lessonById('colors')!;
    const run = play(lessonRun(colors, cfgFor('colors', { steps: ['find-red'] })), [{ type: 'start' }, { type: 'pick', value: 'blue' }]).run;
    expect(captionFor(currentStep(run)!, run)).toBe('That is blue.');
    expect(run.done).toBe(false);
    const right = reduce(run, { type: 'pick', value: 'red' }).run;
    expect(right.done).toBe(true);
    expect(right.wrong).toBeNull();
    expect(captionFor(currentStep(right)!, right)).toBe('That is red.');
  });

  it('any answer is right on the grocery choice, and it is remembered', () => {
    const g = lessonById('grocery')!;
    const run = play(lessonRun(g, cfgFor('grocery', { steps: ['choose', 'put'] })), [{ type: 'start' }, { type: 'pick', value: 'milk' }]).run;
    expect(run.done).toBe(true);
    expect(run.ctx.item).toBe('milk');
    expect(captionFor(currentStep(run)!, run)).toBe('You chose the milk.');
  });
});

describe('Choices at once', () => {
  const find = lessonById('colors')!.steps.find(s => s.k === 'find-red')!;
  it.each([2, 3, 4])('shows %i options and always includes the target', n => {
    const opts = choiceOptions(find, n);
    expect(opts).toHaveLength(n);
    expect(opts).toContain('red');
  });
  it('adds green as a distractor only at 4 choices', () => {
    expect(choiceOptions(find, 3)).not.toContain('green');
    expect(choiceOptions(find, 4)).toContain('green');
  });
  it('rotates the target so it is not always first', () => {
    const steps = lessonById('colors')!.steps.filter(s => s.act === 'choose');
    const positions = steps.map(st => choiceOptions(st, 3).indexOf(st.target!));
    expect(new Set(positions).size).toBeGreaterThan(1);
  });
});

describe('Asking for help or a break', () => {
  const lesson = lessonById('help')!;
  const honored = {
    help: 'A grown-up helps.',
    break: 'You take a break.',
    no: 'Okay. No puzzle.',
    done: 'All done. The puzzle goes away.',
  } as const;

  it.each(Object.entries(honored))('choosing %s leads to a scene where it is honored', (k, text) => {
    const run = play(lessonRun(lesson, cfgFor('help')), [{ type: 'start' }, { type: 'next' }, { type: 'aac', value: k as keyof typeof honored }, { type: 'next' }]).run;
    expect(currentStep(run)!.k).toBe('respond');
    expect(captionFor(currentStep(run)!, run)).toBe(text);
  });

  it('skipping the choice with Next shows "You can ask any time." and nothing else', () => {
    const run = play(lessonRun(lesson, cfgFor('help')), nexts(3)).run;
    expect(currentStep(run)!.k).toBe('respond');
    expect(captionFor(currentStep(run)!, run)).toBe(ASK_ANY_TIME);
  });

  it('has no short version', () => {
    expect(lesson.short).toBeNull();
  });
});

describe('Lesson options', () => {
  it('the toothpaste step can be hidden', () => {
    const run = lessonRun(lessonById('teeth')!, cfgFor('teeth', { opts: { pasteHide: true } }));
    expect(keys(run)).not.toContain('paste');
  });

  it('the busy store is the child\'s choice, and only when the adult allowed it', () => {
    const g = lessonById('grocery')!;
    const notAllowed = lessonRun(g, cfgFor('grocery', { opts: { busy: false } }));
    expect(reduce(notAllowed, { type: 'setBusy', busy: true }).run.ctx.busy).toBe(false);
    const allowed = lessonRun(g, cfgFor('grocery', { opts: { busy: true } }));
    expect(allowed.ctx.busy).toBe(false); // quiet unless the child picks busy
    expect(reduce(allowed, { type: 'setBusy', busy: true }).run.ctx.busy).toBe(true);
  });

  it('only sound-cued steps ask for the water sound, and only after a tap', () => {
    const hands = lessonById('hands')!;
    const run = play(lessonRun(hands, cfgFor('hands')), [{ type: 'start' }, { type: 'next' }]).run;
    expect(currentStep(run)!.k).toBe('water');
    expect(reduce(run, { type: 'tap' }).effects).toContainEqual({ type: 'sound', cue: 'water' });
    const sink = play(lessonRun(hands, cfgFor('hands')), [{ type: 'start' }]).run;
    expect(reduce(sink, { type: 'tap' }).effects.some(e => e.type === 'sound')).toBe(false);
  });
});

describe('Completion', () => {
  it('Again from the end logs "did it again" and restarts at step one', () => {
    const lesson = lessonById('teeth')!;
    const done = play(lessonRun(lesson, cfgFor('teeth')), nexts(lesson.steps.length + 1)).run;
    const res = reduce(done, { type: 'again' });
    expect(res.run.i).toBe(0);
    expect(res.effects[0]).toEqual({ type: 'log', event: 'repeated' });
  });
  it('Finished is quiet: no logs, no sounds', () => {
    const lesson = lessonById('teeth')!;
    const done = play(lessonRun(lesson, cfgFor('teeth')), nexts(lesson.steps.length + 1)).run;
    const res = reduce(done, { type: 'finish' });
    expect(res.run.phase).toBe('finished');
    expect(res.effects).toEqual([]);
  });
});

describe('Photo routines run on the same engine', () => {
  const img = (n: number) => `data:image/svg+xml,${n}`;
  const routine = (interaction: Routine['interaction'], n = 4): Routine => ({
    id: 'r1', pid: 'p1', name: 'Drop-off', on: true, interaction,
    steps: Array.from({ length: n }, (_, i) => ({ img: img(i), cap: `Step ${i + 1}.` })),
  });

  it('tap to continue: every step is a tap step and completes with Next', () => {
    const run = routineRun(routine('tap'));
    expect(run.steps.every(s => s.act === 'tap')).toBe(true);
    expect(play(run, nexts(5)).run.phase).toBe('complete');
  });

  it('find the same picture: the target is the step\'s own photo', () => {
    const run = routineRun(routine('match'));
    for (const st of run.steps) {
      expect(st.act).toBe('choose');
      expect(st.photoOpts!.self).toBe(st.img);
      expect(st.photoOpts!.other).not.toBe(st.img);
    }
  });

  it('choose what comes next: the right option is the next photo, and the last step is a tap', () => {
    const r = routine('choose2');
    const run = routineRun(r);
    run.steps.slice(0, -1).forEach((st, i) => {
      expect(st.act).toBe('choose');
      expect(st.photoOpts!.next).toBe(r.steps[i + 1].img);
      expect(st.photoOpts!.other).not.toBe(st.photoOpts!.next);
    });
    expect(run.steps.at(-1)!.act).toBe('tap');
  });
});

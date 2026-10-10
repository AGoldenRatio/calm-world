/* Child Mode interaction contract, checked against the real rendered app in jsdom. */
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '../src/app';
import { LESSONS } from '../src/content/lessons';
import { STORAGE_KEY, activeProfile, save, store } from '../src/state';
import { GATE_Q, view } from '../src/ui';

let el: HTMLElement;
const $ = <T extends Element = HTMLElement>(sel: string) => el.querySelector<T & HTMLElement>(sel);
const $$ = (sel: string) => [...el.querySelectorAll<HTMLElement>(sel)];
const click = (sel: string) => {
  const b = $(sel);
  if (!b) throw new Error(`nothing matches ${sel}\n${el.innerHTML.slice(0, 400)}`);
  b.click();
};

function expectChildRules(): void {
  // Break is always in the same place: top bar, every screen, with an icon and a word
  const brk = $('.topbar [data-a="openBreak"]');
  expect(brk).not.toBeNull();
  expect(brk!.textContent).toContain('Break');
  // Next is never blocked
  const next = $('.rail [data-a="next"]') as HTMLButtonElement | null;
  if (next) expect(next.disabled).toBe(false);
  // Nothing celebrates
  expect(el.innerHTML).not.toMatch(/confetti|streak|score|great job|well done/i);
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  el = document.getElementById('app')!;
  mount(el);
  click('[data-a="start"]');
});

describe('Child Mode interaction contract', () => {
  it.each(LESSONS.map(l => [l.title, l.id]))('%s: every screen passes, and Next alone reaches the end', (_t, id) => {
    // Maple's hands lesson is the short version; use River for full lessons
    store.S.activeProfileId = store.S.profiles[1].id;
    click('[data-a="openBreak"]'); // re-render as River
    click('[data-a="closeOverlay"]');
    click(`.tile[data-id="${id}"]`);
    expectChildRules();
    expect($('h1')!.textContent).toContain('What we will do');
    click('[data-a="next"]');
    for (let guard = 0; guard < 20 && view.run?.phase === 'step'; guard++) {
      expectChildRules();
      // controls keep their place: Back left, Again middle, Next right
      expect($('.rail > div:first-child [data-a="back"]')).not.toBeNull();
      expect($('.rail .mid [data-a="repeat"]')).not.toBeNull();
      expect($('.rail .right [data-a="next"]')).not.toBeNull();
      click('[data-a="next"]');
    }
    expect(view.run?.phase).toBe('complete');
    expect($('h1')!.textContent).toMatch(/^All done/);
    expectChildRules();
    expect($$('[data-a="again"], [data-a="home"], [data-a="finish"]')).toHaveLength(3);
  });

  it('Break opens Help, Break, No and All done from a step, and returns to the same step', () => {
    click('.tile[data-id="colors"]');
    click('[data-a="next"]');
    click('[data-a="next"]');
    const i = view.run!.i;
    click('[data-a="openBreak"]');
    expect($$('.overlay [data-a="aac"]').map(b => b.dataset.v)).toEqual(['help', 'break', 'no', 'done']);
    click('[data-a="aac"][data-v="break"]');
    expect($('.overlay h1')!.textContent).toBe('Break time.');
    click('[data-a="closeOverlay"]');
    expect(view.overlay).toBeNull();
    expect(view.run!.i).toBe(i);
  });

  it('No offers "Something else", and All done goes home quietly; both are logged as choices', () => {
    click('.tile[data-id="colors"]');
    click('[data-a="next"]');
    click('[data-a="openBreak"]');
    click('[data-a="aac"][data-v="no"]');
    expect($('[data-a="allDone"]')!.textContent).toBe('Something else');
    click('[data-a="openBreak"]');
    click('[data-a="aac"][data-v="done"]');
    expect(view.screen).toBe('home');
    const types = store.S.events.filter(e => !e.example && e.pid === activeProfile().id).map(e => e.type);
    expect(types).toEqual(['ended', 'no', 'started']);
  });

  it('words can be turned off without losing the pictures', () => {
    activeProfile().settings.captions = false;
    click('.tile[data-id="hands"]');
    click('[data-a="next"]');
    expect($('.cap')!.textContent).toBe('');
    expect($('.pic svg')).not.toBeNull();
  });

  it('Hear appears only when narration is on', () => {
    click('.tile[data-id="hands"]');
    click('[data-a="next"]');
    expect($('[data-a="hear"]')).toBeNull();
    activeProfile().settings.narration = true;
    click('[data-a="repeat"]');
    expect($('[data-a="hear"]')).not.toBeNull();
  });

  it('nothing autoplays: no audio, video or timers in Child Mode markup', () => {
    click('.tile[data-id="hands"]');
    click('[data-a="next"]');
    expect(el.querySelector('audio, video, [autoplay]')).toBeNull();
  });
});

describe('Grown-up check', () => {
  it('is reached from the menu, not from the child\'s activity screen', () => {
    expect($('[data-a="openGate"]')).toBeNull();
  });

  it('guards settings and never traps the child', () => {
    click('[data-a="menu"]');
    click('[data-a="openGate"]');
    const input = $('#gateInput') as HTMLInputElement;
    input.value = '0';
    $('form[data-form="gate"]')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(view.mode).toBe('child');
    expect($('.err')).not.toBeNull();
    click('[data-a="closeGate"]');
    expect(view.gate).toBeNull();

    click('[data-a="openGate"]');
    (document.getElementById('gateInput') as HTMLInputElement).value = String(GATE_Q[view.gate!.q][1]);
    $('form[data-form="gate"]')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(view.mode).toBe('adult');
  });
});

describe('Adult controls', () => {
  const openAdult = () => {
    click('[data-a="menu"]');
    click('[data-a="openGate"]');
    (document.getElementById('gateInput') as HTMLInputElement).value = String(GATE_Q[view.gate!.q][1]);
    $('form[data-form="gate"]')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(view.mode).toBe('adult');
  };

  it('a hidden step is skipped in Child Mode', () => {
    const cfg = activeProfile().lessons.find(l => l.id === 'teeth')!;
    cfg.steps = ['find', 'brush', 'rinse'];
    click('.tile[data-id="teeth"]');
    expect(view.run!.steps.map(s => s.k)).toEqual(['find', 'brush', 'rinse']);
  });

  it('a lesson turned off disappears from the home screen', () => {
    activeProfile().lessons.find(l => l.id === 'grocery')!.on = false;
    click('[data-a="openBreak"]'); // any re-render
    click('[data-a="closeOverlay"]');
    expect($('.tile[data-id="grocery"]')).toBeNull();
  });

  it('settings persist locally under a nickname only', () => {
    openAdult();
    click('[data-a="set"][data-k="detail"][data-v="2"]');
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.profiles[0].settings.detail).toBe(2);
    expect(JSON.stringify(saved)).not.toMatch(/birth|diagnos|location|email/i);
  });

  it('turning notes off records nothing for that child', () => {
    activeProfile().settings.tracking = false;
    const before = store.S.events.length;
    click('.tile[data-id="colors"]');
    click('[data-a="next"]');
    expect(store.S.events.length).toBe(before);
  });

  it('adult previews log nothing', () => {
    const before = store.S.events.length;
    openAdult();
    click('[data-a="previewLesson"][data-v="hands"]');
    expect(view.run!.preview).toBe(true);
    while (view.run!.phase === 'preview' || view.run!.phase === 'step') click('[data-a="next"]');
    expect(view.run!.phase).toBe('complete');
    expect(store.S.events.length).toBe(before);
    click('[data-a="endPreview"]');
    expect(view.mode).toBe('adult');
  });

  it('Delete everything leaves one empty profile and no records', () => {
    openAdult();
    click('[data-a="tab"][data-v="privacy"]');
    click('[data-a="confirm"][data-v="all"]');
    click('[data-a="delAll"]');
    expect(store.S.profiles).toHaveLength(1);
    expect(store.S.routines).toHaveLength(0);
    expect(store.S.events).toHaveLength(0);
    expect(store.S.notes).toHaveLength(0);
  });
});

describe('Example profiles from the learner scenarios', () => {
  it('ships Maple, River and Wren with the settings each scenario tests', () => {
    const [maple, river, wren] = store.S.profiles;
    expect(maple.nickname).toBe('Maple');
    expect(maple.settings).toMatchObject({ detail: 0, choices: 2, narration: false, motion: 'off' });
    expect(maple.lessons.find(l => l.id === 'hands')!.steps).toEqual(['water', 'soap', 'rinse', 'dry']);
    expect(river.settings).toMatchObject({ detail: 1, choices: 3, narration: true, motion: 'gentle' });
    expect(river.lessons.find(l => l.id === 'grocery')!.opts.busy).toBe(true);
    expect(wren.settings).toMatchObject({ detail: 2, choices: 4, captions: false, contrast: 'high' });
    expect(store.S.routines.find(r => r.pid === maple.id)!.name).toBe('School drop-off');
  });
});

describe('Home menu', () => {
  beforeEach(() => mount(el));

  it('opens on the menu with just Start and Parent settings', () => {
    expect(view.screen).toBe('menu');
    expect($$('[data-a]').map(b => b.dataset.a)).toEqual(['start', 'openGate']);
    expect($('[data-a="start"]')!.textContent).toContain('Start');
    expect($('[data-a="openGate"]')!.textContent).toContain('Parent settings');
  });

  it('opens on whichever child was last active', () => {
    store.S.activeProfileId = store.S.profiles[1].id;
    save();
    mount(el);
    expect($('.menu-who')!.textContent).toBe('River');
    click('[data-a="start"]');
    expect($('.where b')!.textContent).toBe('River');
  });

  it('Start opens the activities, and Menu returns here', () => {
    click('[data-a="start"]');
    expect($$('.tile').length).toBeGreaterThan(0);
    click('[data-a="menu"]');
    expect(view.screen).toBe('menu');
  });

  it('finishing an activity goes back to the activities, not the menu', () => {
    click('[data-a="start"]');
    click('.tile[data-id="help"]');
    while (view.run!.phase === 'preview' || view.run!.phase === 'step') click('[data-a="next"]');
    click('[data-a="home"]');
    expect(view.screen).toBe('home');
  });

  it('returning from parent settings lands on the menu', () => {
    click('[data-a="openGate"]');
    (document.getElementById('gateInput') as HTMLInputElement).value = String(GATE_Q[view.gate!.q][1]);
    $('form[data-form="gate"]')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    click('[data-a="toChild"]');
    expect(view.mode).toBe('child');
    expect(view.screen).toBe('menu');
  });
});

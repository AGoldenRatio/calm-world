/* Built-in lessons. Steps are data, not code: each lesson is an ordered list of steps that the
   shared engine (src/engine.ts) plays. Photo routines are turned into the same Step shape.

   Difficulty (Easy, Medium, Hard) is set per child and per lesson by a grown-up. A lesson can
   change at higher levels by swapping a step for a harder variant, adding a step (minLevel),
   showing more options, or drawing a bigger task in setup (a longer list, a taller tower). */
import { shuffle } from '../engine';
import { D } from '../symbols';
import type { Ctx, Lesson, Level, Step } from '../types';

const BUSY_PEOPLE: Record<string, [number, number, number][]> = {
  enter: [[96, 350, 0.8], [506, 350, 0.8]], basket: [[480, 350, 0.8]], shop: [[540, 350, 0.7]], pay: [[520, 350, 0.8]],
};
function busy(c: Ctx, k: string): string {
  if (c.mood !== 'busy') return '';
  return (BUSY_PEOPLE[k] ?? []).map(([x, y, s]) => D.person(x, y, s)).join('') + D.sound(540, 56);
}

/** Draw a drawing centered in the 600 x 400 frame at a scale. */
const big = (inner: string, s: number, cx = 0, cy = 0) => `<g transform="translate(300 200) scale(${s}) translate(${-cx} ${-cy})">${inner}</g>`;

/* ---------- everyday objects for "Which one is…?" steps ---------- */
const OBJECTS: Record<string, { label: string; draw: () => string }> = {
  soap: { label: 'soap', draw: () => big(D.soap(0, 0), 2, 0, -15) },
  towel: { label: 'towel', draw: () => big(D.towel(0, -65), 1.5) },
  brush: { label: 'toothbrush', draw: () => big(D.brush(0, 0, -25), 1.4) },
  cup: { label: 'cup', draw: () => big(D.cup(0, 0), 2) },
  spoon: { label: 'spoon', draw: () => big(D.spoon(0, 30), 1.4) },
  comb: { label: 'comb', draw: () => big(D.comb(0, 0), 1.4) },
  tube: { label: 'toothpaste', draw: () => big(D.tube(0, 0), 1.5) },
};
const objStep = (target: string, cap: string, pool: string[]): Partial<Step> => ({
  act: 'choose', cap, target, pool, focal: null,
  optDraw: v => OBJECTS[v].draw(), optLabel: v => OBJECTS[v].label,
  wrongCap: v => `That is the ${OBJECTS[v].label}.`,
});

/* ---------- colors ---------- */
const COLORS = ['red', 'blue', 'yellow'] as const;
const THINGS: Record<string, { color: string; name: string; draw: () => string }> = {
  apple: { color: 'red', name: 'apple', draw: () => D.apple(300, 210, 2.6) },
  'red-ball': { color: 'red', name: 'ball', draw: () => D.ball(300, 200, 'red', 110) },
  'blue-cup': { color: 'blue', name: 'cup', draw: () => D.colorThing('blue', 300, 200) },
  'blue-ball': { color: 'blue', name: 'ball', draw: () => D.ball(300, 200, 'blue', 110) },
  banana: { color: 'yellow', name: 'banana', draw: () => D.banana(300, 200, 2.2) },
  'yellow-ball': { color: 'yellow', name: 'ball', draw: () => D.ball(300, 200, 'yellow', 110) },
  leaf: { color: 'green', name: 'leaf', draw: () => D.colorThing('green', 300, 210) },
  'green-ball': { color: 'green', name: 'ball', draw: () => D.ball(300, 200, 'green', 110) },
};

/* ---------- grocery ---------- */
export const ITEMS: Record<string, { name: string; plural?: boolean }> = {
  apple: { name: 'apple' }, banana: { name: 'banana' }, bread: { name: 'bread' }, milk: { name: 'milk' },
  cheese: { name: 'cheese' }, carrot: { name: 'carrot' }, eggs: { name: 'eggs', plural: true }, cereal: { name: 'cereal' },
};
const the = (v: string) => `the ${ITEMS[v]?.name ?? v}`;
const isAre = (v: string) => (ITEMS[v]?.plural ? 'are' : 'is');
const Cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const GROCERY: Record<Level, { shelf: number; list: number }> = { 1: { shelf: 3, list: 0 }, 2: { shelf: 4, list: 2 }, 3: { shelf: 6, list: 3 } };
const arr = (v: string[] | undefined) => v ?? [];

/** Basket with what is in it, drawn small enough to sit in a corner of any grocery scene. */
function basketWith(items: string[], x = 470, y = 330): string {
  return D.basket(x, y) + items.slice(0, 6).map((v, i) => D.item(v, x - 45 + (i % 3) * 45, y - 52 - Math.floor(i / 3) * 34, 0.55)).join('');
}

const mini = (inner: string) => `<svg viewBox="0 0 120 80" aria-hidden="true">${inner}</svg>`;
const itemMini = (v: string) => mini(D.item(v, 60, 44, 0.75));
const TICK = '<svg class="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const BASKET_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h18l-2 11H5z M8 9l4-6 4 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
const LIST_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6z M9 8h6 M9 12h6 M9 16h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';

function groceryHud(c: Ctx, last: string | null): string {
  const list = arr(c.list), basket = arr(c.basket);
  const listGroup = list.length
    ? `<div class="hud-group" aria-label="Shopping list"><span class="hud-label">${LIST_ICON}List</span>${list.map(v => `<span class="hud-item ${basket.includes(v) ? 'got' : ''}">${itemMini(v)}${ITEMS[v].name}${basket.includes(v) ? TICK : ''}</span>`).join('')}</div>`
    : '';
  const basketGroup = `<div class="hud-group" aria-label="In your basket" aria-live="polite"><span class="hud-label">${BASKET_ICON}Basket</span>${basket.length
    ? basket.map(v => `<span class="hud-item got ${v === last ? 'new' : ''}">${itemMini(v)}${ITEMS[v].name}</span>`).join('')
    : '<span class="hud-empty">Empty</span>'}</div>`;
  return `<div class="hud">${listGroup}${basketGroup}</div>`;
}

/* ---------- blocks ---------- */
const BLOCKS: Record<Level, { colors: string[]; size: number }> = {
  1: { colors: ['wood', 'red', 'blue'], size: 3 },
  2: { colors: ['red', 'blue', 'yellow'], size: 3 },
  3: { colors: ['red', 'blue', 'yellow', 'green'], size: 5 },
};
const blockName = (v: string) => (v === 'wood' ? 'wood' : v);
const wantNext = (c: Ctx) => arr(c.pattern)[arr(c.tower).length];

function blocksHud(c: Ctx): string {
  if (!arr(c.pattern).length) return '';
  const p = arr(c.pattern);
  const h = 40 + p.length * 56;
  return `<div class="hud"><div class="hud-group hud-pattern" aria-label="Picture to copy"><span class="hud-label">Make this</span><svg viewBox="0 ${350 - h} 200 ${h + 10}" aria-hidden="true">${D.tower(100, p)}</svg></div></div>`;
}

/* ---------- asking for help ---------- */
const ASKED: Record<string, string> = {
  help: 'You asked for help.', break: 'You asked for a break.', no: 'You said no.', done: 'You said all done.',
};
const HONORED: Record<string, string> = {
  help: 'A grown-up helps.', break: 'You take a break.', no: 'Okay. No puzzle.', done: 'All done. The puzzle goes away.',
};
export const ASK_ANY_TIME = 'You can ask any time.';

export const LESSONS: Lesson[] = [
  {
    id: 'colors', title: 'Colors', bg: 'room', version: 2,
    levels: ['Find each color from 2 balls.', 'Find each color from 3 balls.', 'Find each color from 4 balls, then find all the things of one color.'],
    setup: (level, rand) => {
      if (level < 3) return {};
      const hunt = COLORS[Math.floor(rand() * COLORS.length)];
      const mine = Object.keys(THINGS).filter(k => THINGS[k].color === hunt);
      const others = shuffle(Object.keys(THINGS).filter(k => THINGS[k].color !== hunt), rand).slice(0, 4);
      return { hunt, things: shuffle([...mine, ...others], rand), found: [] };
    },
    icon: () => D.ball(160, 210, 'red', 75) + D.ball(300, 210, 'blue', 75) + D.ball(440, 210, 'yellow', 75),
    steps: [
      ...COLORS.map((c): Step => ({
        k: 'see-' + c, title: 'See ' + c, cap: `This is ${c}.`, done: `This is ${c}.`, act: 'tap', focal: [300, 205, 135, 135],
        draw: d => (d >= 2 ? D.ball(210, 205, c, 100) + D.colorThing(c, 450, 240) : D.ball(300, 205, c, 110)),
      })),
      ...COLORS.map((c): Step => ({
        k: 'find-' + c, title: 'Find ' + c, cap: `Find ${c}.`, done: `That is ${c}.`, act: 'choose', target: c,
        pool: ['red', 'blue', 'yellow', 'green'],
        optDraw: v => D.ball(300, 200, v, 130), optLabel: v => v, wrongCap: v => `That is ${v}.`,
        draw: () => D.ball(300, 200, c, 110),
      })),
      {
        k: 'find-all', title: 'Find all', minLevel: 3, act: 'collect',
        cap: c => `Find all the ${c.hunt} things.`,
        pickedCap: v => `The ${THINGS[v].name} is ${THINGS[v].color}.`,
        wrongCap: (v, c) => (arr(c.found).includes(v) ? `You found the ${THINGS[v].name}.` : `The ${THINGS[v].name} is ${THINGS[v].color}.`),
        done: c => `You found all the ${c.hunt} things.`,
        collect: {
          options: c => arr(c.things),
          accept: (v, c) => THINGS[v].color === c.hunt && !arr(c.found).includes(v),
          add: (c, v) => ({ ...c, found: [...arr(c.found), v] }),
          count: c => arr(c.found).length,
          goal: c => arr(c.things).filter(k => THINGS[k].color === c.hunt).length,
          used: (v, c) => arr(c.found).includes(v),
        },
        optDraw: v => THINGS[v].draw(), optLabel: v => THINGS[v].name,
        draw: (d, c) => D.box(300, 350) + arr(c.found).map((v, i) => {
          const cx = 300 + (i - (arr(c.found).length - 1) / 2) * 140;
          return `<g transform="translate(${cx - 150} 40) scale(.5)">${THINGS[v].draw()}</g>`;
        }).join(''),
      },
    ],
    short: ['find-red', 'find-blue', 'find-yellow', 'find-all'],
  },

  {
    id: 'hands', title: 'Washing hands', bg: 'bath', version: 2,
    levels: ['Tap each step.', 'Also pick the soap from 3 things.', 'Pick the soap and the towel from 4 things.'],
    icon: () => D.sink(300, 250) + D.water(358, 190, 95) + D.faucet(300, 238),
    steps: [
      { k: 'sink', title: 'Sink', cap: 'This is the sink.', done: 'This is the sink.', act: 'tap', focal: [300, 295, 180, 80],
        draw: () => D.sink(300, 250) + D.faucet(300, 238) },
      { k: 'water', title: 'Water on', cap: 'Turn on the water.', done: 'The water is on.', act: 'tap', sound: 'water', focal: [330, 162, 72, 62],
        draw: (d, c) => D.sink(300, 250) + (c.done ? D.water(358, 190, 95) : '') + D.faucet(300, 238) },
      { k: 'wet', title: 'Wet hands', cap: 'Put your hands in the water.', done: 'Your hands are wet.', act: 'tap', focal: [350, 236, 120, 80],
        draw: (d, c) => D.sink(300, 250) + D.water(358, 190, 95) + D.faucet(300, 238) + D.hands(350, 240) + (c.done ? D.drops(350, 240) : '') },
      { k: 'soap', title: 'Soap', cap: 'Use the soap.', done: 'Rub, rub, rub.', act: 'tap', focal: [448, 172, 62, 82],
        draw: (d, c) => D.sink(300, 250) + D.faucet(300, 238) + D.soap(448, 208) + D.hands(200, 170) + (c.done ? D.bubbles(200, 166) : ''),
        variants: { 2: objStep('soap', 'Which one is the soap?', ['soap', 'towel', 'brush', 'cup']) } },
      { k: 'rinse', title: 'Rinse', cap: 'Rinse the soap away.', done: 'The soap is gone.', act: 'tap', sound: 'water', focal: [350, 236, 120, 80],
        draw: (d, c) => D.sink(300, 250) + D.water(358, 190, 95) + D.faucet(300, 238) + D.hands(350, 240) + (c.done ? '' : D.bubbles(350, 226)) },
      { k: 'dry', title: 'Dry', cap: 'Dry your hands.', done: 'Your hands are dry.', act: 'tap', focal: [470, 135, 82, 80],
        draw: (d, c) => D.sink(300, 250) + D.faucet(300, 238) + D.towel(470, 70) + (c.done ? D.hands(470, 175) : D.hands(190, 170) + D.drops(190, 170)),
        variants: { 3: objStep('towel', 'What do we dry with?', ['towel', 'soap', 'cup', 'comb']) } },
    ],
    short: ['water', 'soap', 'rinse', 'dry'],
  },

  {
    id: 'teeth', title: 'Brushing teeth', bg: 'bath', version: 2,
    levels: ['Tap each step.', 'Also pick the toothbrush from 3 things.', 'Pick the toothbrush and the toothpaste from 4 things.'],
    icon: () => D.counter() + D.brush(330, 150, -75) + D.cup(330, 188),
    steps: [
      { k: 'find', title: 'Toothbrush', cap: 'Find your toothbrush.', done: 'Here it is.', act: 'tap', focal: [420, 150, 82, 110],
        draw: (d, c) => D.counter() + (c.done ? D.brush(300, 170, 0) : D.brush(430, 140, -75) + D.cup(420, 188)),
        variants: { 2: objStep('brush', 'Which one is your toothbrush?', ['brush', 'spoon', 'comb', 'cup']) } },
      { k: 'paste', title: 'Toothpaste', cap: 'Add toothpaste.', done: 'The toothpaste is on.', act: 'tap', assist: true, focal: [340, 170, 90, 66],
        draw: (d, c) => D.counter() + D.brush(270, 205, 0, !!c.done) + D.tube(250, 108),
        variants: { 3: objStep('tube', 'Which one is the toothpaste?', ['tube', 'soap', 'spoon', 'cup']) } },
      { k: 'brush', title: 'Brush', cap: 'Brush your teeth.', done: 'Brush, brush, brush.', act: 'tap', focal: [300, 175, 150, 80],
        draw: (d, c) => D.mouth(300, 170) + D.brush(c.done ? 250 : 340, 300, -15, true) },
      { k: 'rinse', title: 'Rinse', cap: 'Rinse and finish.', done: 'All clean.', act: 'tap', focal: [300, 170, 70, 90],
        draw: (d, c) => D.counter() + (c.done ? D.brush(310, 130, -80) + D.cup(300, 188) : D.cup(300, 188) + D.brush(160, 226, 0)) },
    ],
    short: ['brush', 'rinse'],
  },

  {
    id: 'classroom', title: 'Entering the classroom', bg: 'class', version: 2,
    levels: ['Tap each step.', 'Find your space by its star, from 3 spaces.', 'Find your space by its star, from 4 spaces.'],
    icon: () => D.door(300, 350, false),
    steps: [
      { k: 'door', title: 'Door', cap: 'This is the classroom door.', done: 'The door is open.', act: 'tap', focal: [300, 250, 95, 120],
        draw: (d, c) => D.door(300, 350, !!c.done) },
      { k: 'space', title: 'My space', cap: 'Find your space.', done: 'This is your space.', act: 'tap', focal: [300, 198, 58, 52],
        draw: () => D.cubby(300, 350),
        variants: { 2: { act: 'choose', cap: 'Find your space. It has a star.', target: 'star', pool: ['star', 'circle', 'triangle', 'square'], focal: null,
          optDraw: v => D.cubbyMark(v), optLabel: v => v, wrongCap: v => `That space has a ${v}.` } } },
      { k: 'bag', title: 'Bag', cap: 'Put your bag away.', done: 'Your bag is put away.', act: 'tap', focal: [96, 268, 70, 90],
        draw: (d, c) => `<g transform="translate(60 0)">${D.cubby(300, 350)}${c.done ? D.bag(300, 218, 0.6) : ''}</g>` + (c.done ? '' : D.bag(96, 286)) },
      { k: 'activity', title: 'First activity', cap: 'Start the first activity.', done: 'You started.', act: 'tap', focal: [300, 226, 90, 40],
        draw: (d, c) => D.desk(300, 350) + D.paper(300, 350, !!c.done) },
    ],
    short: ['space', 'activity'],
  },

  {
    id: 'grocery', title: 'Grocery store', bg: 'store', version: 2, busyOption: true,
    levels: ['Choose any one thing from 3 on the shelf.', 'Find 2 things on a shopping list, from 4 on the shelf.', 'Find 3 things on a shopping list, from 6 on the shelf.'],
    setup: (level, rand) => {
      const { shelf: n, list: m } = GROCERY[level];
      const shelf = shuffle(Object.keys(ITEMS), rand).slice(0, n);
      return { shelf, list: shuffle(shelf, rand).slice(0, m), basket: [], belt: [] };
    },
    hud: groceryHud,
    icon: () => D.basket(300, 290) + D.apple(260, 240, 0.9) + D.milk(330, 232, 0.8),
    steps: [
      { k: 'mood', title: 'Quiet or busy', requires: 'busy', act: 'choose', store: 'mood', pool: ['quiet', 'busy'],
        cap: 'Quiet store or busy store?', done: c => (c.mood === 'busy' ? 'A busy store today.' : 'A quiet store today.'),
        optDraw: v => D.store(300, 350, false) + (v === 'busy' ? D.person(96, 350, 0.8) + D.person(506, 350, 0.8) + D.sound(540, 56) : ''),
        optLabel: v => (v === 'busy' ? 'Busy store' : 'Quiet store'),
        draw: () => D.store(300, 350, false) },
      { k: 'enter', title: 'Store', cap: 'This is the store.', done: 'You go inside.', act: 'tap', focal: [300, 250, 95, 120],
        draw: (d, c) => D.store(300, 350, !!c.done) + busy(c, 'enter') },
      { k: 'basket', title: 'Basket', cap: 'Get a basket.', done: 'You have a basket.', act: 'tap', focal: [300, 260, 110, 90], hud: true,
        draw: (d, c) => D.basket(300, 300) + busy(c, 'basket') },
      { k: 'list', title: 'List', minLevel: 2, act: 'tap', hud: true, focal: [300, 200, 110, 165],
        cap: 'Here is your shopping list.', done: c => `Find ${arr(c.list).map(v => ITEMS[v].name).join(' and ')}.`,
        draw: (d, c) => D.listPaper(arr(c.list)) },
      { k: 'shop', title: 'Shop', act: 'collect', hud: true,
        cap: c => (arr(c.list).length ? 'Find the things on your list.' : 'Choose one thing.'),
        pickedCap: v => `${Cap(the(v))} ${isAre(v)} in your basket.`,
        wrongCap: (v, c) => (arr(c.basket).includes(v) ? `${Cap(the(v))} ${isAre(v)} already in your basket.` : `${Cap(the(v))} ${isAre(v)} not on your list.`),
        done: c => (arr(c.list).length ? 'You found everything on your list.' : `You chose ${the(arr(c.basket)[0] ?? '')}.`),
        collect: {
          options: c => arr(c.shelf),
          accept: (v, c) => !arr(c.basket).includes(v) && (!arr(c.list).length || arr(c.list).includes(v)),
          add: (c, v) => ({ ...c, basket: [...arr(c.basket), v] }),
          count: c => arr(c.basket).length,
          goal: c => Math.max(1, arr(c.list).length),
          used: (v, c) => arr(c.basket).includes(v),
        },
        optDraw: v => D.item(v, 300, 210, 2.6), optLabel: v => ITEMS[v].name,
        draw: (d, c) => D.shelf(14, 110, 110) + D.shelf(150, 110, 110) + basketWith(arr(c.basket), 430, 330) + busy(c, 'shop') },
      { k: 'belt', title: 'Checkout', act: 'collect', hud: true,
        cap: 'Put your things on the belt.', pickedCap: v => `${Cap(the(v))} ${isAre(v)} on the belt.`, done: 'Everything is on the belt.',
        wrongCap: v => `${Cap(the(v))} ${isAre(v)} on the belt.`,
        collect: {
          options: c => arr(c.basket),
          accept: (v, c) => !arr(c.belt).includes(v),
          add: (c, v) => ({ ...c, belt: [...arr(c.belt), v] }),
          count: c => arr(c.belt).length,
          goal: c => arr(c.basket).length,
          used: (v, c) => arr(c.belt).includes(v),
        },
        optDraw: v => D.item(v, 300, 210, 2.6), optLabel: v => ITEMS[v].name,
        draw: (d, c) => D.register(280, 350) + arr(c.belt).map((v, i) => D.item(v, 170 + i * 46, 216, 0.55)).join('') },
      { k: 'pay', title: 'Pay', cap: 'Pay with the card.', done: 'You paid.', act: 'tap', focal: [300, 260, 120, 120], hud: true,
        draw: (d, c) => busy(c, 'pay') + D.cardReader(300, 330, !!c.done) + (c.done ? '' : D.card(440, 220)) },
      { k: 'bag', title: 'Bag', cap: 'Put your things in the bag.', done: 'Your things are in the bag.', act: 'tap', focal: [300, 250, 120, 110],
        draw: (d, c) => D.paperBag(300, 340) + (c.done
          ? arr(c.basket).slice(0, 3).map((v, i) => D.item(v, 250 + i * 50, 190, 0.6)).join('')
          : arr(c.basket).map((v, i) => D.item(v, 110 + i * 60, 320, 0.6)).join('')) },
      { k: 'leave', title: 'Leave', cap: 'Leave the store.', done: 'Goodbye, store.', act: 'tap', focal: [300, 250, 95, 120],
        draw: (d, c) => D.door(300, 350, !!c.done) + `<path class="mark" d="M262 110 h70 m-22 -18 l22 18 l-22 18"/>` },
    ],
    short: ['shop', 'belt', 'pay'],
  },

  {
    id: 'blocks', title: 'Wood blocks', bg: 'room', version: 1,
    levels: ['Build any tower of 3 blocks.', 'Copy a picture of 3 colored blocks.', 'Copy a picture of 5 blocks in 4 colors.'],
    setup: (level, rand) => {
      const { colors, size } = BLOCKS[level];
      // A picture to copy, with no color three times in a row so it stays interesting.
      const pattern: string[] = [];
      while (level > 1 && pattern.length < size) {
        const v = colors[Math.floor(rand() * colors.length)];
        if (!(pattern.at(-1) === v && pattern.at(-2) === v)) pattern.push(v);
      }
      return { tower: [], pattern };
    },
    hud: c => blocksHud(c),
    icon: () => D.tower(300, ['blue', 'yellow', 'red'], 340, 110, 52),
    steps: [
      { k: 'open', title: 'Box', cap: 'Open the box of blocks.', done: 'Here are the blocks.', act: 'tap', focal: [300, 270, 120, 80],
        draw: (d, c) => (c.done ? D.box(300, 350) + D.block(180, 350, 'red', 90, 44) + D.block(420, 350, 'blue', 90, 44) + D.block(300, 236, 'yellow', 90, 44) : D.box(300, 350)) },
      { k: 'build', title: 'Build', act: 'collect', hud: true,
        cap: c => (arr(c.pattern).length ? 'Make a tower like the picture.' : 'Build a tower. Tap a block.'),
        pickedCap: (v, c) => (arr(c.pattern).length ? `A ${blockName(v)} block. Next is ${wantNext(c)}.` : `A ${blockName(v)} block.`),
        wrongCap: (v, c) => `That is ${blockName(v)}. The picture shows ${wantNext(c)}.`,
        done: c => (arr(c.pattern).length ? 'Your tower looks like the picture.' : 'You built a tower.'),
        collect: {
          options: c => BLOCKS[c.level ?? 1].colors,
          accept: (v, c) => !arr(c.pattern).length || wantNext(c) === v,
          add: (c, v) => ({ ...c, tower: [...arr(c.tower), v] }),
          count: c => arr(c.tower).length,
          goal: c => (arr(c.pattern).length || BLOCKS[1].size),
          want: c => wantNext(c),
        },
        optDraw: v => D.block(300, 300, v, 440, 200), optLabel: v => blockName(v),
        draw: (d, c) => D.tower(300, arr(c.tower), 380, 110, 52) + (arr(c.tower).length ? '' : `<line class="l faint" x1="220" y1="380" x2="380" y2="380"/>`) },
      { k: 'tidy', title: 'Tidy up', cap: 'Put the blocks back in the box.', done: 'The blocks are in the box.', act: 'tap', focal: [300, 260, 120, 110],
        draw: (d, c) => (c.done ? D.box(300, 350) : D.tower(200, arr(c.tower).length ? arr(c.tower) : ['red', 'blue'], 350, 100, 48) + D.box(450, 350)) },
    ],
    short: ['build'],
  },

  {
    id: 'help', title: 'Asking for help or a break', bg: 'room', version: 1,
    icon: () => `<g transform="translate(300 230) scale(2)">${D.hand(0, 0)}</g>`,
    steps: [
      { k: 'hard', title: 'Puzzle', cap: 'This puzzle is hard.', done: 'It is hard.', act: 'tap', focal: [300, 170, 100, 100],
        draw: () => D.desk(300, 350) + D.puzzle(300, 170, true) },
      { k: 'ask', title: 'Ask', cap: 'What do you need?', act: 'aac',
        done: c => (c.choice ? ASKED[c.choice] : undefined),
        draw: () => D.desk(300, 350) + D.puzzle(300, 170, true) },
      { k: 'respond', title: 'It happens', act: 'next',
        cap: c => (c.choice && HONORED[c.choice]) || ASK_ANY_TIME,
        draw: (d, c) =>
          c.choice === 'help' ? D.desk(300, 350) + D.puzzle(300, 170, false) + D.hand(450, 150, -1, 1.2)
          : c.choice === 'break' ? D.couch(300, 330)
          : c.choice === 'no' ? D.desk(300, 350) + D.box(480, 330)
          : c.choice === 'done' ? D.box(300, 320)
          : D.desk(300, 350) + D.puzzle(300, 170, true) },
    ],
    short: null,
  },
];

export const lessonById = (id: string): Lesson | undefined => LESSONS.find(l => l.id === id);

/* Built-in lessons. Steps are data, not code: each lesson is an ordered list of steps that the
   shared engine (src/engine.ts) plays. Photo routines are turned into the same Step shape. */
import { D, type ColorName } from '../symbols';
import type { Ctx, Lesson, Step } from '../types';

function busy(c: Ctx, people: [number, number, number][]): string {
  if (!c.busy) return '';
  return people.map(([x, y, s]) => D.person(x, y, s)).join('') + D.sound(540, 56);
}

const COLORS: ColorName[] = ['red', 'blue', 'yellow'];

const ASKED: Record<string, string> = {
  help: 'You asked for help.',
  break: 'You asked for a break.',
  no: 'You said no.',
  done: 'You said all done.',
};
const HONORED: Record<string, string> = {
  help: 'A grown-up helps.',
  break: 'You take a break.',
  no: 'Okay. No puzzle.',
  done: 'All done. The puzzle goes away.',
};
export const ASK_ANY_TIME = 'You can ask any time.';

export const LESSONS: Lesson[] = [
  {
    id: 'colors', title: 'Colors', bg: 'room', version: 1,
    icon: () => D.ball(160, 210, 'red', 75) + D.ball(300, 210, 'blue', 75) + D.ball(440, 210, 'yellow', 75),
    steps: [
      ...COLORS.map((c): Step => ({
        k: 'see-' + c, title: 'See ' + c, cap: `This is ${c}.`, done: `This is ${c}.`, act: 'tap', focal: [300, 205, 135, 135],
        draw: d => (d >= 2 ? D.ball(210, 205, c, 100) + D.colorThing(c, 450, 240) : D.ball(300, 205, c, 110)),
      })),
      ...COLORS.map((c, i): Step => ({
        k: 'find-' + c, title: 'Find ' + c, cap: `Find ${c}.`, done: `That is ${c}.`, act: 'choose', target: c,
        pool: ['red', 'blue', 'yellow', 'green'], rot: i,
        optDraw: v => D.ball(300, 200, v, 130), optLabel: v => v, wrongCap: v => `That is ${v}.`,
        draw: () => D.ball(300, 200, c, 110),
      })),
    ],
    short: ['find-red', 'find-blue', 'find-yellow'],
  },

  {
    id: 'hands', title: 'Washing hands', bg: 'bath', version: 1,
    icon: () => D.sink(300, 250) + D.water(358, 190, 95) + D.faucet(300, 238),
    steps: [
      { k: 'sink', title: 'Sink', cap: 'This is the sink.', done: 'This is the sink.', act: 'tap', focal: [300, 295, 180, 80],
        draw: () => D.sink(300, 250) + D.faucet(300, 238) },
      { k: 'water', title: 'Water on', cap: 'Turn on the water.', done: 'The water is on.', act: 'tap', sound: 'water', focal: [330, 162, 72, 62],
        draw: (d, c) => D.sink(300, 250) + (c.done ? D.water(358, 190, 95) : '') + D.faucet(300, 238) },
      { k: 'wet', title: 'Wet hands', cap: 'Put your hands in the water.', done: 'Your hands are wet.', act: 'tap', focal: [350, 236, 120, 80],
        draw: (d, c) => D.sink(300, 250) + D.water(358, 190, 95) + D.faucet(300, 238) + D.hands(350, 240) + (c.done ? D.drops(350, 240) : '') },
      { k: 'soap', title: 'Soap', cap: 'Use the soap.', done: 'Rub, rub, rub.', act: 'tap', focal: [448, 172, 62, 82],
        draw: (d, c) => D.sink(300, 250) + D.faucet(300, 238) + D.soap(448, 208) + D.hands(200, 170) + (c.done ? D.bubbles(200, 166) : '') },
      { k: 'rinse', title: 'Rinse', cap: 'Rinse the soap away.', done: 'The soap is gone.', act: 'tap', sound: 'water', focal: [350, 236, 120, 80],
        draw: (d, c) => D.sink(300, 250) + D.water(358, 190, 95) + D.faucet(300, 238) + D.hands(350, 240) + (c.done ? '' : D.bubbles(350, 226)) },
      { k: 'dry', title: 'Dry', cap: 'Dry your hands.', done: 'Your hands are dry.', act: 'tap', focal: [470, 135, 82, 80],
        draw: (d, c) => D.sink(300, 250) + D.faucet(300, 238) + D.towel(470, 70) + (c.done ? D.hands(470, 175) : D.hands(190, 170) + D.drops(190, 170)) },
    ],
    short: ['water', 'soap', 'rinse', 'dry'],
  },

  {
    id: 'teeth', title: 'Brushing teeth', bg: 'bath', version: 1,
    icon: () => D.counter() + D.brush(330, 150, -75) + D.cup(330, 188),
    steps: [
      { k: 'find', title: 'Toothbrush', cap: 'Find your toothbrush.', done: 'Here it is.', act: 'tap', focal: [420, 150, 82, 110],
        draw: (d, c) => D.counter() + (c.done ? D.brush(300, 170, 0) : D.brush(430, 140, -75) + D.cup(420, 188)) },
      { k: 'paste', title: 'Toothpaste', cap: 'Add toothpaste.', done: 'The toothpaste is on.', act: 'tap', assist: true, focal: [340, 170, 90, 66],
        draw: (d, c) => D.counter() + D.brush(270, 205, 0, !!c.done) + D.tube(250, 108) },
      { k: 'brush', title: 'Brush', cap: 'Brush your teeth.', done: 'Brush, brush, brush.', act: 'tap', focal: [300, 175, 150, 80],
        draw: (d, c) => D.mouth(300, 170) + D.brush(c.done ? 250 : 340, 300, -15, true) },
      { k: 'rinse', title: 'Rinse', cap: 'Rinse and finish.', done: 'All clean.', act: 'tap', focal: [300, 170, 70, 90],
        draw: (d, c) => D.counter() + (c.done ? D.brush(310, 130, -80) + D.cup(300, 188) : D.cup(300, 188) + D.brush(160, 226, 0)) },
    ],
    short: ['brush', 'rinse'],
  },

  {
    id: 'classroom', title: 'Entering the classroom', bg: 'class', version: 1,
    icon: () => D.door(300, 350, false),
    steps: [
      { k: 'door', title: 'Door', cap: 'This is the classroom door.', done: 'The door is open.', act: 'tap', focal: [300, 250, 95, 120],
        draw: (d, c) => D.door(300, 350, !!c.done) },
      { k: 'space', title: 'My space', cap: 'Find your space.', done: 'This is your space.', act: 'tap', focal: [300, 198, 58, 52],
        draw: () => D.cubby(300, 350) },
      { k: 'bag', title: 'Bag', cap: 'Put your bag away.', done: 'Your bag is put away.', act: 'tap', focal: [96, 268, 70, 90],
        draw: (d, c) => `<g transform="translate(60 0)">${D.cubby(300, 350)}${c.done ? D.bag(300, 218, 0.6) : ''}</g>` + (c.done ? '' : D.bag(96, 286)) },
      { k: 'activity', title: 'First activity', cap: 'Start the first activity.', done: 'You started.', act: 'tap', focal: [300, 226, 90, 40],
        draw: (d, c) => D.desk(300, 350) + D.paper(300, 350, !!c.done) },
    ],
    short: ['space', 'activity'],
  },

  {
    id: 'grocery', title: 'Grocery store', bg: 'store', version: 1, busyOption: true,
    icon: () => D.basket(300, 290) + D.apple(260, 240, 0.9) + D.milk(330, 232, 0.8),
    steps: [
      { k: 'enter', title: 'Store', cap: 'This is the store.', done: 'You go inside.', act: 'tap', focal: [300, 250, 95, 120],
        draw: (d, c) => D.store(300, 350, !!c.done) + busy(c, [[96, 350, 0.8], [506, 350, 0.8]]) },
      { k: 'basket', title: 'Basket', cap: 'Get a basket.', done: 'You have a basket.', act: 'tap', focal: [300, 260, 110, 90],
        draw: (d, c) => D.basket(300, 300) + busy(c, [[480, 350, 0.8]]) },
      { k: 'choose', title: 'Choose', cap: 'Choose one thing.', act: 'choose', store: 'item', pool: ['apple', 'bread', 'milk'],
        optDraw: v => D.item(v, 300, 200, 2.4), optLabel: v => v, done: c => `You chose the ${c.item || 'item'}.`,
        draw: () => `<rect class="l f2" x="80" y="262" width="440" height="20" rx="4"/>` + D.apple(180, 226) + D.bread(300, 232) + D.milk(420, 214) },
      { k: 'put', title: 'In the basket', cap: 'Put it in the basket.', done: 'It is in the basket.', act: 'tap', focal: [300, 268, 110, 90],
        draw: (d, c) => D.basket(300, 320) + (c.done ? D.item(c.item, 300, 262, 0.9) : D.item(c.item, 300, 110, 1.2)) },
      { k: 'pay', title: 'Pay', cap: 'Pay at the checkout.', done: 'You paid.', act: 'tap', focal: [300, 250, 160, 110],
        draw: (d, c) => busy(c, [[520, 350, 0.8]]) + D.register(280, 350) + (c.done ? D.item(c.item, 200, 214, 0.7) : '') },
      { k: 'leave', title: 'Leave', cap: 'Leave the store.', done: 'Goodbye, store.', act: 'tap', focal: [300, 250, 95, 120],
        draw: (d, c) => D.door(300, 350, !!c.done) + `<path class="mark" d="M262 110 h70 m-22 -18 l22 18 l-22 18"/>` },
    ],
    short: ['basket', 'choose', 'pay'],
  },

  {
    id: 'help', title: 'Asking for help or a break', bg: 'room', version: 1,
    icon: () => `<g transform="translate(300 230) scale(2)">${D.hand(0, 0)}</g>`,
    steps: [
      { k: 'hard', title: 'Puzzle', cap: 'This puzzle is hard.', done: 'It is hard.', act: 'tap', focal: [300, 170, 100, 100],
        draw: () => D.desk(300, 350) + D.puzzle(300, 170, true) },
      { k: 'ask', title: 'Ask', cap: 'What do you need?', act: 'aac', store: 'choice',
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

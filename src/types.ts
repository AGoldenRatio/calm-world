import type { AacKey, Bg, Detail } from './symbols';

/** The four step types. Every step can also be passed with Next: no response is ever required. */
export type StepAct = 'tap' | 'choose' | 'aac' | 'next';

export type Level = 1 | 2 | 3;

/** Per-run context that drawings and captions read. Collect steps add to its lists. */
export interface Ctx {
  level?: Level;
  choice?: AacKey | null;
  /** Grocery: quiet or busy store, chosen by the child when an adult allows it. */
  mood?: 'quiet' | 'busy';
  /** Grocery: shopping list, items on the shelf, in the basket, on the belt. */
  list?: string[];
  shelf?: string[];
  basket?: string[];
  belt?: string[];
  /** Blocks: picture to copy, and the tower so far. */
  pattern?: string[];
  tower?: string[];
  /** Colors: things to search, the color to find, and what was found. */
  things?: string[];
  hunt?: string;
  found?: string[];
  /** The current step has been acted on. */
  done?: boolean;
}

export type Text = string | ((c: Ctx) => string | undefined);

/** A step where the child taps several things in turn: items into a basket, blocks onto a tower. */
export interface Collect {
  /** What the child can tap now. */
  options: (c: Ctx) => string[];
  /** Does this tap count? */
  accept: (v: string, c: Ctx) => boolean;
  /** The context after a counted tap. */
  add: (c: Ctx, v: string) => Ctx;
  /** Taps counted so far, and how many finish the step. */
  count: (c: Ctx) => number;
  goal: (c: Ctx) => number;
  /** Options already used, shown as picked. */
  used?: (v: string, c: Ctx) => boolean;
  /** The one option that counts next, outlined softly after a different tap. */
  want?: (c: Ctx) => string | undefined;
}

export interface Step {
  k: string;
  title: string;
  act: StepAct | 'collect';
  cap: Text;
  done?: Text;
  draw: (d: Detail, c: Ctx) => string;
  /** Focal ring for tap steps: cx, cy, rx, ry. */
  focal?: [number, number, number, number] | null;
  sound?: 'water';
  /** Shows a "With a grown-up" chip when the lesson option is on. */
  assist?: boolean;
  /** choose steps: the right answer, if there is one. Without a target any answer is right. */
  target?: string;
  pool?: string[];
  /** Context key a choose pick is stored under. */
  store?: 'mood' | 'choice';
  collect?: Collect;
  optDraw?: (v: string) => string;
  optLabel?: (v: string) => string;
  wrongCap?: (v: string, c: Ctx) => string;
  /** Caption after a counted tap on a collect step. */
  pickedCap?: (v: string, c: Ctx) => string;
  /** Photo routines: option value -> image URL. */
  photoOpts?: Record<string, string>;
  /** Photo routines: the step's own photo. */
  img?: string;
  /** Only played at this difficulty or above. */
  minLevel?: Level;
  /** A harder version of the step at a difficulty. The highest variant at or below the level wins. */
  variants?: Partial<Record<2 | 3, Partial<Step>>>;
  /** Only played when an adult option is on, and never hidden by step choices (e.g. the busy-store choice). */
  requires?: 'busy';
  /** Show the lesson's activity panel (shopping list, basket, block picture) on this step. */
  hud?: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  bg: Bg;
  version: number;
  icon: () => string;
  steps: Step[];
  /** Step keys of the one-tap short version, in order. null when the lesson has none. */
  short: string[] | null;
  busyOption?: boolean;
  /** What Easy, Medium and Hard mean for this lesson. Absent when the lesson has one level. */
  levels?: [string, string, string];
  /** Per-run content (shopping list, block picture), drawn with the run's random source. */
  setup?: (level: Level, rand: () => number) => Partial<Ctx>;
  /** The activity panel: HTML shown under the caption on steps marked hud. */
  hud?: (c: Ctx, last: string | null) => string;
}

export interface Settings {
  narration: boolean;
  rate: number;
  envAudio: boolean;
  volume: number;
  motion: 'off' | 'gentle' | 'more';
  detail: Detail;
  contrast: 'standard' | 'high';
  /** After the child acts on a step, move on by itself after a short pause. */
  autoNext: boolean;
  captions: boolean;
  schedule: boolean;
  bigTargets: boolean;
  tracking: boolean;
}

export interface LessonOpts {
  pasteAssist?: boolean;
  pasteHide?: boolean;
  busy?: boolean;
}

export interface LessonCfg {
  id: string;
  on: boolean;
  /** Visible step keys, in lesson order. null means all steps. */
  steps: string[] | null;
  opts: LessonOpts;
  /** Difficulty: 1 Easy, 2 Medium, 3 Hard. */
  level: Level;
}

export interface Profile {
  id: string;
  nickname: string;
  example?: boolean;
  settings: Settings;
  lessons: LessonCfg[];
  /** Communication card overrides: key -> image data URL. */
  aac: Partial<Record<AacKey, string>>;
}

export type Interaction = 'tap' | 'choose2' | 'match';

export interface RoutineStep {
  img: string;
  cap: string;
}

export interface Routine {
  id: string;
  pid: string;
  name: string;
  on: boolean;
  interaction: Interaction;
  steps: RoutineStep[];
  example?: boolean;
}

export type EventType = 'started' | 'completed' | 'repeated' | 'ended' | 'break' | 'help' | 'no';

export interface ActivityEvent {
  id: string;
  t: number;
  pid: string;
  ref: string;
  type: EventType;
  example?: boolean;
}

export type Support = '' | 'adult-assisted' | 'prompted' | 'independent';

export interface Observation {
  id: string;
  t: number;
  pid: string;
  ref: string;
  support: Support;
  obs: string[];
  text: string;
  example?: boolean;
}

export interface Store {
  v: 1;
  activeProfileId: string;
  profiles: Profile[];
  routines: Routine[];
  events: ActivityEvent[];
  notes: Observation[];
}

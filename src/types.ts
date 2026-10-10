import type { AacKey, Bg, Detail } from './symbols';

/** The four step types. Every step can also be passed with Next: no response is ever required. */
export type StepAct = 'tap' | 'choose' | 'aac' | 'next';

/** Per-run context that drawings and captions read. */
export interface Ctx {
  item?: string;
  choice?: AacKey | null;
  busy?: boolean;
  /** The current step has been acted on (tap, correct pick, card chosen). */
  done?: boolean;
}

export type Text = string | ((c: Ctx) => string | undefined);

export interface Step {
  k: string;
  title: string;
  act: StepAct;
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
  rot?: number;
  /** Context key the pick is stored under. */
  store?: 'item' | 'choice';
  optDraw?: (v: string) => string;
  optLabel?: (v: string) => string;
  wrongCap?: (v: string) => string;
  /** Photo routines: option value -> image URL. */
  photoOpts?: Record<string, string>;
  /** Photo routines: the step's own photo. */
  img?: string;
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
}

export interface Settings {
  narration: boolean;
  rate: number;
  envAudio: boolean;
  volume: number;
  motion: 'off' | 'gentle' | 'more';
  detail: Detail;
  contrast: 'standard' | 'high';
  choices: 2 | 3 | 4;
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

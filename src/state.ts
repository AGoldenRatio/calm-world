/* Local-only state. Everything about a child lives in this browser, under a nickname,
   and can be exported or deleted in one action. Nothing is sent anywhere. */
import { LESSONS, lessonById } from './content/lessons';
import { D, svgImg } from './symbols';
import type { EventType, LessonCfg, Profile, Settings, Store } from './types';

export const STORAGE_KEY = 'calmworld.v1';

export const uid = () => Math.random().toString(36).slice(2, 10);

/** Every setting defaults to the quietest option. */
export const DEFAULT_SETTINGS: Settings = {
  narration: false, rate: 0.9, envAudio: false, volume: 0.4, motion: 'off', detail: 0, contrast: 'standard',
  choices: 2, captions: true, schedule: true, bigTargets: true, tracking: true,
};

export function lessonConfig(): LessonCfg[] {
  return LESSONS.map(l => ({
    id: l.id, on: true, steps: null,
    opts: l.id === 'teeth' ? { pasteAssist: true } : l.id === 'grocery' ? { busy: false } : {},
  }));
}

export function makeProfile(nickname: string, over: Partial<Settings> = {}, example = false): Profile {
  return { id: uid(), nickname, example, settings: { ...DEFAULT_SETTINGS, ...over }, lessons: lessonConfig(), aac: {} };
}

/** The three learner scenarios from the product plan, plus a little example history. */
export function seed(now = Date.now()): Store {
  const maple = makeProfile('Maple', { detail: 0, choices: 2, narration: false, motion: 'off' }, true);
  maple.lessons.find(x => x.id === 'hands')!.steps = [...lessonById('hands')!.short!];
  const river = makeProfile('River', { detail: 1, choices: 3, narration: true, motion: 'gentle' }, true);
  river.lessons.find(x => x.id === 'grocery')!.opts.busy = true;
  const wren = makeProfile('Wren', { detail: 2, choices: 4, captions: false, narration: true, rate: 0.8, contrast: 'high' }, true);
  const day = 864e5;
  return {
    v: 1, activeProfileId: maple.id, profiles: [maple, river, wren],
    routines: [{
      id: uid(), pid: maple.id, example: true, on: true, name: 'School drop-off', interaction: 'tap', steps: [
        { img: svgImg(D.door(300, 350, false)), cap: 'Walk to the school door.' },
        { img: svgImg(D.cubby(300, 350)), cap: 'Find your cubby.' },
        { img: svgImg(`<g transform="translate(60 0)">${D.cubby(300, 350)}</g>${D.bag(96, 286)}`), cap: 'Put your bag away.' },
        { img: svgImg(D.desk(300, 350) + D.paper(300, 350, true)), cap: 'Sit at your desk.' },
      ],
    }],
    events: [
      { id: uid(), t: now - day * 2 - 3600e3, pid: maple.id, ref: 'hands', type: 'started', example: true },
      { id: uid(), t: now - day * 2 - 3500e3, pid: maple.id, ref: 'hands', type: 'break', example: true },
      { id: uid(), t: now - day * 2 - 3300e3, pid: maple.id, ref: 'hands', type: 'completed', example: true },
      { id: uid(), t: now - day - 7200e3, pid: maple.id, ref: 'help', type: 'started', example: true },
      { id: uid(), t: now - day - 7000e3, pid: maple.id, ref: 'help', type: 'completed', example: true },
    ],
    notes: [
      { id: uid(), t: now - day * 2, pid: maple.id, ref: 'hands', support: 'prompted', obs: ['followed sequence', 'requested break'],
        text: 'Used the Break card once at the soap step, then came back on her own. At the real sink she reached for the soap without a prompt.', example: true },
      { id: uid(), t: now - day, pid: maple.id, ref: 'help', support: 'adult-assisted', obs: ['used help'],
        text: 'Tapped Help during the puzzle scene. Tried the same card at snack time.', example: true },
    ],
  };
}

export function emptyStore(): Store {
  const p = makeProfile('Child 1');
  return { v: 1, activeProfileId: p.id, profiles: [p], routines: [], events: [], notes: [] };
}

/** Fill in anything a stored profile is missing, e.g. a lesson added in a later version. */
function migrate(s: Store): Store {
  for (const p of s.profiles) {
    p.settings = { ...DEFAULT_SETTINGS, ...p.settings };
    p.aac = p.aac || {};
    for (const cfg of lessonConfig()) if (!p.lessons.some(x => x.id === cfg.id)) p.lessons.push(cfg);
    p.lessons = p.lessons.filter(x => lessonById(x.id));
  }
  return s;
}

export const store = {
  S: seed() as Store,
  storageOK: true,
};

export function load(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.v === 1 && Array.isArray(s.profiles) && s.profiles.length) return migrate(s);
    }
  } catch {
    store.storageOK = false;
  }
  return seed();
}

export function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store.S));
  } catch {
    store.storageOK = false;
  }
}

export const activeProfile = (): Profile => store.S.profiles.find(p => p.id === store.S.activeProfileId) || store.S.profiles[0];
export const activeSettings = (): Settings => activeProfile()?.settings ?? DEFAULT_SETTINGS;

const MAX_EVENTS = 600;

/** Neutral activity log. Respects the per-child "Keep activity notes" switch. */
export function logEvent(type: EventType, ref: string): void {
  const p = activeProfile();
  if (!p || !p.settings.tracking) return;
  store.S.events.unshift({ id: uid(), t: Date.now(), pid: p.id, ref, type });
  if (store.S.events.length > MAX_EVENTS) store.S.events.length = MAX_EVENTS;
  save();
}

export const EVENT_LABEL: Record<EventType, string> = {
  started: 'Started', completed: 'Finished all steps', repeated: 'Did it again', ended: 'Chose all done',
  break: 'Asked for a break', help: 'Asked for help', no: 'Said no',
};

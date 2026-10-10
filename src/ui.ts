/* UI state and small shared helpers for the views. */
import type { Run } from './engine';
import type { AacKey } from './symbols';
import type { Interaction, RoutineStep } from './types';

export type Tab = 'profiles' | 'lessons' | 'routines' | 'notes' | 'privacy';
export type Overlay = 'menu' | Exclude<AacKey, 'done'>;

export interface Draft {
  id?: string;
  pid?: string;
  on?: boolean;
  example?: boolean;
  name: string;
  interaction: Interaction;
  steps: RoutineStep[];
}

export interface ViewState {
  mode: 'child' | 'adult';
  screen: 'home' | 'run';
  run: Run | null;
  /** The running preview came from the routine builder; return there afterwards. */
  fromDraft: boolean;
  overlay: Overlay | null;
  gate: { q: number; err: boolean } | null;
  tab: Tab;
  draft: Draft | null;
  confirm: 'profile' | 'notes' | 'all' | null;
  exp: string | null;
  msg: string | null;
  homePage: number;
}

export const view: ViewState = {
  mode: 'child', screen: 'home', run: null, fromDraft: false, overlay: null, gate: null, tab: 'profiles',
  draft: null, confirm: null, exp: null, msg: null, homePage: 0,
};

export function resetView(): void {
  Object.assign(view, {
    mode: 'child', screen: 'home', run: null, fromDraft: false, overlay: null, gate: null, tab: 'profiles',
    draft: null, confirm: null, exp: null, msg: null, homePage: 0,
  } satisfies ViewState);
}

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Only data: URLs we created ourselves are ever placed in src attributes. */
export const safeImg = (url: string | undefined) => (url && url.startsWith('data:image/') ? esc(url) : '');

export const ICON = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  again: '<svg viewBox="0 0 24 24"><path d="M5 12a7 7 0 1 0 2-5M5 4v4h4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  hear: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9q2 3 0 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  brk: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>',
};

/** Grown-up check: type the number from its word. */
export const GATE_Q: [string, number][] = [
  ['forty-seven', 47], ['sixty-three', 63], ['twenty-eight', 28], ['ninety-one', 91], ['fifty-four', 54], ['thirty-six', 36],
];

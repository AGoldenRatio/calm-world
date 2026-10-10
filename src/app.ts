/* App shell: renders the current view and routes every user action.
   Run actions go through the pure engine; its effects (log, speak, sound, exit) are applied here. */
import { speak, waterSound } from './audio';
import { lessonById } from './content/lessons';
import { captionFor, currentStep, lessonRun, reduce, routineRun, type Action, type Effect } from './engine';
import { shrink } from './photos';
import { activeProfile, activeSettings, emptyStore, load, logEvent, makeProfile, save, seed, store, uid } from './state';
import type { AacKey } from './symbols';
import type { Routine, Settings, Support } from './types';
import { GATE_Q, resetView, view, type Tab } from './ui';
import { OBSERVATIONS, adultView, draftReady } from './views/adult';
import { childHome, childRun, gateView, overlayView } from './views/child';

const DRAFT_ID = '__draft';
let root: HTMLElement;

export function render(): void {
  const s = activeSettings();
  const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.className = view.mode === 'child' ? `${s.contrast === 'high' ? 'hc' : ''} m-${reduce ? 'off' : s.motion} ${s.bigTargets ? 'big' : ''}` : '';
  root.innerHTML = view.mode === 'adult'
    ? adultView()
    : (view.screen === 'run' && view.run ? childRun() : childHome()) + overlayView() + gateView();
  if (view.gate) (document.getElementById('gateInput') as HTMLInputElement | null)?.focus();
}

/* ---------- runs ---------- */

function startRun(kind: 'lesson' | 'routine', id: string, preview = false): void {
  const p = activeProfile();
  if (kind === 'lesson') {
    const lesson = lessonById(id);
    if (!lesson) return;
    view.run = lessonRun(lesson, p.lessons.find(x => x.id === id), preview);
  } else {
    const r = store.S.routines.find(x => x.id === id);
    if (!r) return;
    view.run = routineRun(r, preview);
  }
  view.screen = 'run';
  view.mode = 'child';
  view.overlay = null;
  render();
}

function applyEffects(effects: Effect[]): void {
  for (const e of effects) {
    if (e.type === 'log' && view.run && !view.run.preview) logEvent(e.event, view.run.id);
    if (e.type === 'speak') speak(e.text);
    if (e.type === 'sound' && e.cue === 'water') waterSound();
    if (e.type === 'exit') return goHome();
  }
}

function dispatch(action: Action): void {
  if (!view.run) return;
  const { run, effects } = reduce(view.run, action);
  view.run = run;
  const exits = effects.some(e => e.type === 'exit');
  if (!exits) render();
  applyEffects(effects);
}

function goHome(): void {
  if (view.run?.preview) return endPreview();
  view.run = null;
  view.screen = 'home';
  view.overlay = null;
  render();
}

function endPreview(): void {
  if (view.fromDraft) store.S.routines = store.S.routines.filter(r => r.id !== DRAFT_ID);
  view.fromDraft = false;
  view.run = null;
  view.screen = 'home';
  view.overlay = null;
  view.mode = 'adult';
  render();
}

/* ---------- actions (data-a="…") ---------- */

type Handler = (el: HTMLElement) => void;
const num = (v: string | undefined) => Number(v);

const A: Record<string, Handler> = {
  // child home
  open: e => startRun(e.dataset.kind === 'lesson' ? 'lesson' : 'routine', e.dataset.id!),
  homePage: e => { view.homePage += num(e.dataset.d); render(); },

  // run engine
  next: () => dispatch({ type: 'next' }),
  back: () => dispatch({ type: 'back' }),
  repeat: () => dispatch({ type: 'repeat' }),
  tap: () => dispatch({ type: 'tap' }),
  pick: e => dispatch({ type: 'pick', value: e.dataset.v! }),
  pickAac: e => dispatch({ type: 'aac', value: e.dataset.v as AacKey }),
  again: () => dispatch({ type: 'again' }),
  finish: () => dispatch({ type: 'finish' }),
  setBusy: e => dispatch({ type: 'setBusy', busy: e.dataset.v === 'busy' }),
  hear: () => { const st = view.run && currentStep(view.run); if (st) speak(captionFor(st, view.run!)); },
  home: () => goHome(),
  endPreview: () => endPreview(),

  // Break overlay: outside the loop, returns to where the child was, or home
  openBreak: () => { view.overlay = 'menu'; render(); },
  aac: e => {
    const k = e.dataset.v as AacKey;
    const ref = view.run ? view.run.id : 'home';
    const log = !view.run?.preview;
    if (k === 'done') {
      if (view.screen === 'run' && log) logEvent('ended', ref);
      return goHome();
    }
    if (log) logEvent(k, ref);
    view.overlay = k;
    render();
    speak({ help: 'Help is coming.', break: 'Break time.', no: 'Okay.' }[k]);
  },
  closeOverlay: () => { view.overlay = null; render(); },
  allDone: () => { if (view.run && !view.run.preview) logEvent('ended', view.run.id); goHome(); },

  // grown-up check
  openGate: () => { view.gate = { q: Math.floor(Math.random() * GATE_Q.length), err: false }; render(); },
  closeGate: () => { view.gate = null; render(); },
  toChild: () => { Object.assign(view, { mode: 'child', screen: 'home', run: null, draft: null, confirm: null, exp: null }); render(); },
  tab: e => { view.tab = e.dataset.v as Tab; view.confirm = null; view.msg = null; render(); },

  // profiles
  pickProfile: e => { store.S.activeProfileId = e.dataset.v!; view.confirm = null; view.draft = null; save(); render(); },
  addProfile: () => {
    const p = makeProfile('Child ' + (store.S.profiles.length + 1));
    store.S.profiles.push(p);
    store.S.activeProfileId = p.id;
    save();
    render();
    (document.getElementById('nick') as HTMLInputElement | null)?.select();
  },
  set: e => {
    const k = e.dataset.k as keyof Settings;
    (activeProfile().settings as unknown as Record<string, unknown>)[k] = e.dataset.num ? num(e.dataset.v) : e.dataset.v;
    save();
    render();
  },
  confirm: e => { view.confirm = e.dataset.v as typeof view.confirm; render(); },
  cancelConfirm: () => { view.confirm = null; render(); },
  delProfile: () => {
    const S = store.S, id = activeProfile().id;
    S.profiles = S.profiles.filter(p => p.id !== id);
    S.routines = S.routines.filter(r => r.pid !== id);
    S.notes = S.notes.filter(n => n.pid !== id);
    S.events = S.events.filter(n => n.pid !== id);
    S.activeProfileId = S.profiles[0].id;
    view.confirm = null;
    save();
    render();
  },
  aacReset: e => { delete activeProfile().aac[e.dataset.v as AacKey]; save(); render(); },

  // activities
  previewLesson: e => startRun('lesson', e.dataset.v!, true),
  previewRoutine: e => startRun('routine', e.dataset.v!, true),
  move: e => {
    const arr = activeProfile().lessons, i = num(e.dataset.v), j = i + num(e.dataset.d);
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    save();
    render();
  },
  stepTog: e => {
    const cfg = activeProfile().lessons.find(x => x.id === e.dataset.v)!, l = lessonById(cfg.id)!, k = e.dataset.k!;
    let keep = cfg.steps ? [...cfg.steps] : l.steps.map(x => x.k);
    keep = keep.includes(k) ? keep.filter(x => x !== k) : [...keep, k];
    if (!keep.length) return; // a lesson always keeps at least one step
    cfg.steps = l.steps.map(x => x.k).filter(x => keep.includes(x));
    save();
    render();
  },
  shortVer: e => { activeProfile().lessons.find(x => x.id === e.dataset.v)!.steps = [...lessonById(e.dataset.v!)!.short!]; save(); render(); },
  allSteps: e => { activeProfile().lessons.find(x => x.id === e.dataset.v)!.steps = null; save(); render(); },

  // photo routines
  newRoutine: () => { view.draft = { name: '', interaction: 'tap', steps: [] }; view.msg = null; render(); },
  editRoutine: e => { const r = store.S.routines.find(x => x.id === e.dataset.v); if (r) view.draft = structuredClone(r); view.msg = null; render(); },
  dset: e => { view.draft!.interaction = e.dataset.v as Routine['interaction']; render(); },
  dmove: e => { const a = view.draft!.steps, i = num(e.dataset.v), j = i + num(e.dataset.d); [a[i], a[j]] = [a[j], a[i]]; render(); },
  drem: e => { view.draft!.steps.splice(num(e.dataset.v), 1); render(); },
  cancelDraft: () => { view.draft = null; view.msg = null; render(); },
  saveRoutine: () => {
    const d = view.draft!, p = activeProfile();
    if (!draftReady(d.name, d.steps.length)) return;
    if (d.id) {
      const i = store.S.routines.findIndex(r => r.id === d.id);
      store.S.routines[i] = { ...store.S.routines[i], name: d.name.trim(), interaction: d.interaction, steps: d.steps };
    } else {
      store.S.routines.push({ id: uid(), pid: p.id, on: true, name: d.name.trim(), interaction: d.interaction, steps: d.steps });
    }
    view.draft = null;
    save();
    render();
  },
  previewDraft: () => {
    const d = view.draft!;
    store.S.routines = store.S.routines.filter(r => r.id !== DRAFT_ID);
    store.S.routines.push({ id: DRAFT_ID, pid: activeProfile().id, on: false, name: d.name || 'Untitled routine', interaction: d.interaction, steps: d.steps });
    view.fromDraft = true;
    startRun('routine', DRAFT_ID, true);
  },
  delRoutine: () => { store.S.routines = store.S.routines.filter(r => r.id !== view.draft!.id); view.draft = null; save(); render(); },

  // notes, privacy & data
  delNote: e => { store.S.notes = store.S.notes.filter(n => n.id !== e.dataset.v); save(); render(); },
  delNotes: () => {
    const id = activeProfile().id;
    store.S.notes = store.S.notes.filter(n => n.pid !== id);
    store.S.events = store.S.events.filter(n => n.pid !== id);
    view.confirm = null;
    save();
    render();
  },
  delAll: () => { store.S = emptyStore(); view.confirm = null; view.exp = null; save(); render(); },
  restoreExamples: () => {
    const ex = seed();
    store.S.profiles.push(...ex.profiles);
    store.S.routines.push(...ex.routines);
    store.S.events.push(...ex.events);
    store.S.notes.push(...ex.notes);
    store.S.activeProfileId = ex.profiles[0].id;
    save();
    render();
  },
  export: () => { view.exp = view.exp ? null : exportJSON(); render(); },
  download: () => {
    const url = URL.createObjectURL(new Blob([exportJSON()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `calm-world-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  copyExp: () => {
    const out = document.getElementById('copied')!;
    const select = () => {
      const el = document.getElementById('expText')!, rg = document.createRange();
      rg.selectNodeContents(el);
      const sl = getSelection()!;
      sl.removeAllRanges();
      sl.addRange(rg);
      out.textContent = 'Selected. Press copy on your keyboard.';
    };
    try { navigator.clipboard.writeText(view.exp || '').then(() => { out.textContent = 'Copied.'; }, select); } catch { select(); }
  },
};

const exportJSON = () => JSON.stringify({ ...store.S, routines: store.S.routines.filter(r => r.id !== DRAFT_ID) }, null, 2);

/* ---------- events ---------- */

function onClick(e: MouseEvent): void {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-a]');
  if (!el || (el as HTMLButtonElement).disabled) return;
  const fn = A[el.dataset.a!];
  if (fn) { e.preventDefault(); fn(el); }
}

function onSubmit(e: SubmitEvent): void {
  const f = (e.target as HTMLElement).dataset.form;
  e.preventDefault();
  if (f === 'gate' && view.gate) {
    const v = ((document.getElementById('gateInput') as HTMLInputElement).value || '').trim();
    if (v !== '' && Number(v) === GATE_Q[view.gate.q][1]) {
      Object.assign(view, { gate: null, mode: 'adult', overlay: null });
    } else {
      view.gate.err = true;
    }
    render();
  }
  if (f === 'note') {
    const p = activeProfile();
    const obs = OBSERVATIONS.filter((_, i) => (document.getElementById('nobs' + i) as HTMLInputElement).checked);
    const text = (document.getElementById('ntext') as HTMLTextAreaElement).value.trim();
    const support = (document.getElementById('nsup') as HTMLSelectElement).value as Support;
    if (!obs.length && !text && !support) return;
    const ref = (document.getElementById('nref') as HTMLSelectElement).value;
    store.S.notes.unshift({ id: uid(), t: Date.now(), pid: p.id, ref, support, obs, text });
    save();
    render();
  }
}

function onInput(e: Event): void {
  const t = e.target as HTMLInputElement;
  if (t.dataset.in === 'nickname') { activeProfile().nickname = t.value.trim() || 'Child'; save(); }
  if (t.dataset.din === 'name' && view.draft) {
    view.draft.name = t.value;
    const b = root.querySelector<HTMLButtonElement>('[data-a="saveRoutine"]');
    if (b) b.disabled = !draftReady(t.value, view.draft.steps.length);
  }
  if (t.dataset.dcap != null && view.draft) view.draft.steps[Number(t.dataset.dcap)].cap = t.value;
}

function onChange(e: Event): void {
  const t = e.target as HTMLInputElement, p = activeProfile();
  if (t.dataset.in === 'nickname') return render();
  if (t.dataset.sel === 'activeProfile') {
    store.S.activeProfileId = t.value;
    view.confirm = null;
    view.draft = null;
    save();
    return render();
  }
  if (t.dataset.tog) {
    const k = t.dataset.tog;
    if (k.startsWith('on:')) p.lessons.find(x => x.id === k.slice(3))!.on = t.checked;
    else if (k.startsWith('ron:')) store.S.routines.find(r => r.id === k.slice(4))!.on = t.checked;
    else if (k.startsWith('o:')) {
      const [, id, opt] = k.split(':');
      (p.lessons.find(x => x.id === id)!.opts as Record<string, boolean>)[opt] = t.checked;
    } else (p.settings as unknown as Record<string, boolean>)[k] = t.checked;
    save();
    return render();
  }
  if (t.dataset.aacfile) {
    const f = t.files?.[0];
    if (!f) return;
    const key = t.dataset.aacfile as AacKey;
    shrink(f, 360).then(url => { if (url) { p.aac[key] = url; save(); render(); } });
    return;
  }
  if (t.hasAttribute('data-rfiles') && view.draft) {
    const draft = view.draft, all = [...(t.files || [])], room = 8 - draft.steps.length, files = all.slice(0, room);
    view.msg = all.length > room ? `Only ${room} more photo${room === 1 ? '' : 's'} fit, so the rest were left out.` : null;
    Promise.all(files.map(f => shrink(f, 900))).then(urls => {
      urls.forEach(u => u && draft.steps.push({ img: u, cap: '' }));
      render();
    });
  }
}

/** Mount the app into an element. Safe to call again (tests do), which resets the view. */
export function mount(el: HTMLElement): void {
  if (root) {
    root.removeEventListener('click', onClick);
    root.removeEventListener('submit', onSubmit);
    root.removeEventListener('input', onInput);
    root.removeEventListener('change', onChange);
  }
  root = el;
  store.storageOK = true;
  store.S = load();
  resetView();
  root.addEventListener('click', onClick);
  root.addEventListener('submit', onSubmit);
  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
  render();
}

/* Child Mode: top bar with Break, the step strip, one picture, and a fixed control rail.
   Back bottom left, Again bottom center, Next bottom right. Next is never disabled. */
import { lessonById } from '../content/lessons';
import { captionFor, choiceOptions, currentStep, type Run } from '../engine';
import { activeProfile, store } from '../state';
import { AAC, AAC_KEYS, BG, D, svgWrap, type AacKey, type Detail } from '../symbols';
import type { Step } from '../types';
import { GATE_Q, ICON, esc, safeImg, view } from '../ui';

function sceneFor(st: Step, run: Run, d: Detail): string {
  const c = { ...run.ctx, done: run.done };
  let inner = (run.bg ? BG(run.bg, d) : '') + st.draw(d, c);
  if (st.act === 'tap' && !run.done && st.focal) {
    const [x, y, rx, ry] = st.focal;
    inner += `<ellipse class="ring" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`;
  }
  return inner;
}

function thumb(st: Step, run: Run): string {
  if (st.img) return `<img src="${safeImg(st.img)}" alt="">`;
  return svgWrap((run.bg ? BG(run.bg, 0) : '') + st.draw(0, { ...run.ctx, done: false }), 'mini');
}

export function aacPic(k: AacKey): string {
  const img = activeProfile().aac[k];
  return img ? `<img src="${safeImg(img)}" alt="">` : svgWrap(AAC[k].draw());
}

function topbar(left: string): string {
  const r = view.run;
  return `<div class="topbar">${left}<div class="row" style="flex-wrap:nowrap">
    ${r && r.preview ? `<button class="btn quiet" data-a="endPreview">Back to settings</button>` : ''}
    <button class="btn brk" data-a="openBreak" aria-label="Break, help, no, or all done">${ICON.brk}<span>Break</span></button></div></div>`;
}

interface TileItem { kind: 'lesson' | 'routine'; id: string; title: string; pic: string }

export function childHome(): string {
  const p = activeProfile(), s = p.settings;
  const lessons: TileItem[] = p.lessons.filter(x => x.on && lessonById(x.id)).map(x => {
    const l = lessonById(x.id)!;
    return { kind: 'lesson', id: x.id, title: l.title, pic: svgWrap(l.icon(), 'mini') };
  });
  const routines: TileItem[] = store.S.routines
    .filter(r => r.pid === p.id && r.on && r.steps.length)
    .map(r => ({ kind: 'routine', id: r.id, title: r.name, pic: `<img src="${safeImg(r.steps[0].img)}" alt="">` }));
  const all = [...lessons, ...routines];
  const per = 6, pages = Math.max(1, Math.ceil(all.length / per));
  view.homePage = Math.max(0, Math.min(view.homePage, pages - 1));
  const shown = all.slice(view.homePage * per, view.homePage * per + per);
  const tiles = shown.map(t =>
    `<button class="tile" data-a="open" data-kind="${t.kind}" data-id="${esc(t.id)}" aria-label="${esc(t.title)}"><div class="tv">${t.pic}</div><b>${s.captions ? esc(t.title) : ''}</b></button>`).join('');
  return `<div class="child">${topbar(`<div class="where"><button class="btn quiet" data-a="openGate">Grown-ups</button><b>${esc(p.nickname)}</b></div>`)}
    <div class="strip"></div>
    <div class="tiles fade">${tiles || `<div class="center"><h1>No activities yet</h1><p>A grown-up can turn activities on in settings.</p></div>`}</div>
    <div class="rail"><div>${view.homePage > 0 ? `<button class="btn" data-a="homePage" data-d="-1">${ICON.back}<span class="lb">More</span></button>` : ''}</div><div></div>
      <div class="right">${view.homePage < pages - 1 ? `<button class="btn" data-a="homePage" data-d="1"><span class="lb">More</span>${ICON.next}</button>` : ''}</div></div></div>`;
}

export function childRun(): string {
  const r = view.run!, s = activeProfile().settings, d: Detail = r.kind === 'routine' ? 0 : s.detail;
  const where = `<div class="where"><b>${s.captions ? esc(r.title) : ''}</b>${r.preview ? '<span class="tag">Preview</span>' : ''}</div>`;
  const strip = (on: boolean) => s.schedule && on
    ? `<div class="strip" aria-label="Steps">${r.steps.map((st, i) => `<span class="s ${i < r.i ? 'past' : ''} ${i === r.i ? 'now' : ''}">${thumb(st, r)}</span>`).join('')}</div>`
    : `<div class="strip"></div>`;

  if (r.phase === 'preview') {
    const busyPick = r.busyOption
      ? `<div class="row">${(['quiet', 'busy'] as const).map(v => `<button class="opt ${!!r.ctx.busy === (v === 'busy') ? 'picked' : ''}" style="min-width:200px" data-a="setBusy" data-v="${v}" aria-pressed="${!!r.ctx.busy === (v === 'busy')}"><div class="ov" style="height:110px">${svgWrap(BG('store', 1) + D.store(300, 350, false) + (v === 'busy' ? D.person(96, 350, 0.8) + D.person(506, 350, 0.8) + D.sound(540, 56) : ''))}</div><span>${v === 'busy' ? 'Busy store' : 'Quiet store'}</span></button>`).join('')}</div>`
      : '';
    return `<div class="child">${topbar(where)}<div class="strip"></div>
      <div class="center fade"><h1>${s.captions ? 'What we will do' : ''}</h1>
        <div class="strip" style="max-width:900px">${r.steps.map(st => `<span class="s past" style="width:120px">${thumb(st, r)}</span>`).join('')}</div>${busyPick}</div>
      <div class="rail"><div><button class="btn" data-a="back">${ICON.back}<span class="lb">Back</span></button></div><div></div>
        <div class="right"><button class="btn primary" data-a="next"><span>Start</span>${ICON.next}</button></div></div></div>`;
  }
  if (r.phase === 'complete') {
    return `<div class="child">${topbar(where)}${strip(false)}
      <div class="center fade"><h1>All done${s.captions ? ': ' + esc(r.title) : ''}.</h1>
        <div class="strip" style="max-width:900px">${r.steps.map(st => `<span class="s past">${thumb(st, r)}</span>`).join('')}</div>
        <div class="row"><button class="btn" data-a="again">${ICON.again}<span>Again</span></button><button class="btn" data-a="home">${ICON.home}<span>Home</span></button><button class="btn primary" data-a="finish"><span>Finished</span></button></div></div>
      <div class="rail"></div></div>`;
  }
  if (r.phase === 'finished') {
    return `<div class="child">${topbar(where)}<div class="strip"></div><div class="center fade"><div class="bigpic">${svgWrap(D.doneBox())}</div><h1>Finished.</h1><button class="btn" data-a="home">${ICON.home}<span>Home</span></button></div><div class="rail"></div></div>`;
  }

  const st = currentStep(r)!, cap = captionFor(st, r), chooser = st.act === 'choose' || st.act === 'aac';
  const scene = svgWrap(sceneFor(st, r, d));
  const picEl = st.act === 'tap' && !r.done
    ? `<button class="pic fade" data-a="tap" aria-label="${esc(cap)} Tap the picture.">${scene}</button>`
    : `<div class="pic fade">${scene}</div>`;
  let opts = '';
  if (st.act === 'choose') {
    const pool = choiceOptions(st, s.choices);
    opts = `<div class="opts" style="--n:${pool.length}">${pool.map(v => {
      const pic = st.photoOpts ? `<img src="${safeImg(st.photoOpts[v])}" alt="">` : svgWrap(st.optDraw!(v));
      const picked = r.done && ((st.store && r.ctx[st.store] === v) || st.target === v);
      const cls = picked ? 'picked' : r.wrong && st.target === v ? 'hint' : '';
      const lab = st.optLabel ? st.optLabel(v) : '';
      return `<button class="opt ${cls}" data-a="pick" data-v="${esc(v)}" aria-label="${esc(lab || 'picture')}"><div class="ov">${pic}</div>${s.captions && lab ? `<span>${esc(lab)}</span>` : ''}</button>`;
    }).join('')}</div>`;
  }
  if (st.act === 'aac') {
    opts = `<div class="opts" style="--n:4">${AAC_KEYS.map(k => `<button class="opt ${r.ctx.choice === k ? 'picked' : ''}" data-a="pickAac" data-v="${k}" aria-label="${AAC[k].label}"><div class="ov">${aacPic(k)}</div>${s.captions ? `<span>${AAC[k].label}</span>` : ''}</button>`).join('')}</div>`;
  }
  const assistTag = r.kind === 'lesson' && st.assist && r.assist ? `<span class="chip">With a grown-up</span>` : '';
  return `<div class="child">${topbar(where)}${strip(true)}
    <div class="stage ${chooser ? 'choose' : ''}"><div class="picwrap">${picEl}</div>
      ${assistTag}<p class="cap ${r.wrong ? 'soft' : ''}" aria-live="polite">${s.captions ? esc(cap) : ''}</p>${opts}</div>
    <div class="rail"><div><button class="btn" data-a="back">${ICON.back}<span class="lb">Back</span></button></div>
      <div class="mid"><button class="btn" data-a="repeat" aria-label="Do this step again">${ICON.again}<span class="lb">Again</span></button>${s.narration ? `<button class="btn" data-a="hear" aria-label="Hear it">${ICON.hear}</button>` : ''}</div>
      <div class="right"><button class="btn primary" data-a="next"><span class="lb">Next</span>${ICON.next}</button></div></div></div>`;
}

export function overlayView(): string {
  const o = view.overlay;
  if (!o) return '';
  if (o === 'menu') {
    return `<div class="overlay" role="dialog" aria-label="What do you need?"><div class="panel fade">
      <h1 class="cap">What do you need?</h1>
      <div class="aacgrid">${AAC_KEYS.map(k => `<button class="aac" data-a="aac" data-v="${k}"><div class="av">${aacPic(k)}</div><b>${AAC[k].label}</b></button>`).join('')}</div>
      <button class="btn" data-a="closeOverlay">${ICON.back}<span>Back to activity</span></button></div></div>`;
  }
  const inRun = view.screen === 'run' && !!view.run && view.run.phase !== 'finished';
  const back = `<button class="btn primary" data-a="closeOverlay"><span>${inRun ? 'Back to activity' : 'Okay'}</span></button>`;
  const allDone = (label: string) => (inRun ? `<button class="btn" data-a="allDone"><span>${label}</span></button>` : '');
  const screens: Record<typeof o, [string, string, string]> = {
    help: ['Help is coming.', AAC.help.draw(), back + allDone('All done')],
    break: ['Break time.', D.couch(300, 320), `<button class="btn primary" data-a="closeOverlay"><span>Ready</span></button>` + allDone('All done')],
    no: ['Okay.', D.noSign(), allDone('Something else') + back],
  };
  const [t, pic, btns] = screens[o];
  const own = activeProfile().aac[o];
  const art = own ? `<img src="${safeImg(own)}" alt="" style="width:100%;height:100%;object-fit:contain">` : svgWrap(pic);
  return `<div class="overlay" role="dialog" aria-label="${t}"><div class="panel fade"><div class="bigpic">${art}</div><h1 class="cap">${t}</h1><div class="row">${btns}</div></div></div>`;
}

export function gateView(): string {
  if (!view.gate) return '';
  const [w] = GATE_Q[view.gate.q];
  return `<div class="overlay" role="dialog" aria-label="Grown-up check"><form class="gate" data-form="gate">
    <h2>For grown-ups</h2><p style="margin:0">Type the number <b>${w}</b> in digits to open settings.</p>
    <input id="gateInput" inputmode="numeric" autocomplete="off" aria-label="Number in digits">
    ${view.gate.err ? `<p class="err">That number doesn't match. Check the word and try again.</p>` : ''}
    <div class="row" style="justify-content:flex-start"><button class="abtn primary" type="submit">Open settings</button><button class="abtn" type="button" data-a="closeGate">Cancel</button></div></form></div>`;
}

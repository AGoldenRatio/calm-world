/* Adult Mode, behind the grown-up check: profiles, activities, photo routines, notes, privacy and data. */
import { lessonById } from '../content/lessons';
import { EVENT_LABEL, activeProfile, store } from '../state';
import { AAC, AAC_KEYS, BG, svgWrap } from '../symbols';
import type { Profile } from '../types';
import { esc, safeImg, view, type Tab } from '../ui';
import { aacPic } from './child';

const TABS: [Tab, string][] = [['profiles', 'Child profile'], ['lessons', 'Activities'], ['routines', 'Photo routines'], ['notes', 'Notes'], ['privacy', 'Privacy & data']];
export const OBSERVATIONS = ['recognized item', 'followed sequence', 'requested break', 'used help', 'said no', 'stopped early'];
const LEVEL_NAMES = ['Easy', 'Medium', 'Hard'];
/** The difficulty most of a child's activities are at, for the profile card. */
const mainLevel = (p: Profile) => {
  const n = [1, 2, 3].map(l => p.lessons.filter(x => x.level === l).length);
  return n.indexOf(Math.max(...n)) + 1;
};
const INTERACTION_LABEL = { tap: 'Tap to continue', choose2: 'Choose what comes next', match: 'Find the same picture' };

export function adultView(): string {
  const p = activeProfile();
  const S = store.S;
  const body = ({ profiles: tabProfiles, lessons: tabLessons, routines: tabRoutines, notes: tabNotes, privacy: tabPrivacy })[view.tab](p);
  return `<div class="adult"><header class="ahead"><h1>Calm World <small>Grown-up settings</small></h1>
    <label class="sw" style="gap:8px"><span style="color:var(--muted);font-size:14px">Child</span>
      <select class="abtn" data-sel="activeProfile" aria-label="Choose child profile">${S.profiles.map(x => `<option value="${esc(x.id)}" ${x.id === p.id ? 'selected' : ''}>${esc(x.nickname)}</option>`).join('')}</select></label>
    <button class="abtn primary" data-a="toChild">Return to child mode</button></header>
    <div class="abody"><nav class="anav" aria-label="Settings sections">${TABS.map(([k, t]) => `<button data-a="tab" data-v="${k}" ${view.tab === k ? 'aria-current="page"' : ''}>${t}</button>`).join('')}</nav>
    <main class="amain">${!store.storageOK ? `<div class="banner">This browser is blocking storage, so changes last only until the page closes.</div>` : ''}${body}</main></div></div>`;
}

const seg = (key: string, opts: [string | number, string][], v: unknown, num = false) =>
  `<div class="seg" role="group">${opts.map(([o, l]) => `<button type="button" data-a="set" data-k="${key}" data-v="${o}" data-num="${num ? 1 : ''}" aria-pressed="${String(v) === String(o)}">${l}</button>`).join('')}</div>`;
const tog = (key: string, v: boolean | undefined, label: string) =>
  `<label class="sw"><input type="checkbox" data-tog="${esc(key)}" ${v ? 'checked' : ''}><span>${label}</span></label>`;

function tabProfiles(p: Profile): string {
  const s = p.settings, S = store.S;
  const prev = svgWrap(BG('bath', s.detail) + lessonById('hands')!.steps[1].draw(s.detail, { done: true }));
  return `<div><h2>Child profile</h2><p class="lede">Each child gets their own sensory, display and communication settings. Changes apply before the next activity starts. Use a nickname, not a full name.</p></div>
  <div class="plist">${S.profiles.map(x => `<button class="pcard" data-a="pickProfile" data-v="${esc(x.id)}" aria-pressed="${x.id === p.id}"><b>${esc(x.nickname)} ${x.example ? '<span class="tag ex">Example</span>' : ''}</b><small>${['Minimal', 'Moderate', 'Detailed'][x.settings.detail]} picture · ${LEVEL_NAMES[mainLevel(x) - 1]} · sound ${x.settings.narration || x.settings.envAudio ? 'on' : 'off'}</small></button>`).join('')}
    <button class="pcard" data-a="addProfile" aria-pressed="false"><b>+ Add a child</b><small>Starts with calm defaults</small></button></div>
  <div class="split"><div style="display:flex;flex-direction:column;gap:16px">
    <section class="group"><header><h3>Name</h3></header>
      <div class="field"><span>Nickname</span><input class="txt" id="nick" data-in="nickname" value="${esc(p.nickname)}" maxlength="24"></div></section>
    <section class="group"><header><h3>Sound</h3><small style="color:var(--muted)">Off unless you turn it on. Sound only plays after the child taps.</small></header>
      <div class="field"><span>Read steps aloud</span>${tog('narration', s.narration, s.narration ? 'On' : 'Off')}</div>
      <div class="field"><span>Voice speed</span>${seg('rate', [[0.7, 'Slow'], [0.9, 'Calm'], [1.1, 'Usual']], s.rate, true)}</div>
      <div class="field"><span>Real-world sounds</span>${tog('envAudio', s.envAudio, s.envAudio ? 'On' : 'Off')}<small>Soft running water in the hand-washing activity.</small></div>
      <div class="field"><span>Volume</span>${seg('volume', [[0.2, 'Quiet'], [0.4, 'Low'], [0.7, 'Medium']], s.volume, true)}</div></section>
    <section class="group"><header><h3>Pictures and movement</h3></header>
      <div class="field"><span>Picture detail</span>${seg('detail', [[0, 'Minimal'], [1, 'Moderate'], [2, 'Detailed']], s.detail, true)}<small>Minimal shows one object. Detailed adds the room around it.</small></div>
      <div class="field"><span>Contrast</span>${seg('contrast', [['standard', 'Standard'], ['high', 'High']], s.contrast)}</div>
      <div class="field"><span>Movement</span>${seg('motion', [['off', 'Off'], ['gentle', 'Gentle fades'], ['more', 'More motion']], s.motion)}<small>The device's reduce-motion setting always wins.</small></div>
      <div class="field"><span>Larger buttons</span>${tog('bigTargets', s.bigTargets, s.bigTargets ? 'On' : 'Off')}</div></section>
    <section class="group"><header><h3>Pace and words</h3><small style="color:var(--muted)">Difficulty is set for each activity under Activities.</small></header>
      <div class="field"><span>Move on after each step</span>${tog('autoNext', s.autoNext, s.autoNext ? 'By itself, after a short pause' : 'Wait for Next')}<small>Next always works either way. Nothing moves on until the child has done the step.</small></div>
      <div class="field"><span>Show words</span>${tog('captions', s.captions, s.captions ? 'On' : 'Off')}<small>Turn off for children who don't read yet. Pictures carry every step either way.</small></div>
      <div class="field"><span>Step strip</span>${tog('schedule', s.schedule, s.schedule ? 'On' : 'Off')}<small>The row of small pictures that shows where the child is in the activity.</small></div></section>
    <section class="group"><header><h3>Communication cards</h3><small style="color:var(--muted)">Swap in the symbols this child already uses with their AAC system.</small></header>
      <div class="aacedit">${AAC_KEYS.map(k => `<div class="ae"><div class="av">${aacPic(k)}</div><b>${AAC[k].label}</b>
        <label class="abtn sm">Use my picture<input type="file" accept="image/*" data-aacfile="${k}"></label>
        ${p.aac[k] ? `<button class="abtn sm" data-a="aacReset" data-v="${k}">Use default</button>` : ''}</div>`).join('')}</div></section>
    <section class="group"><header><h3>Notes</h3></header>
      <div class="field"><span>Keep activity notes</span>${tog('tracking', s.tracking, s.tracking ? 'On' : 'Off')}<small>When off, nothing about this child's use is recorded.</small></div></section>
    ${S.profiles.length > 1 ? `<section class="group"><header><h3>Remove this child</h3></header>${view.confirm === 'profile'
      ? `<div class="confirm"><b>Delete ${esc(p.nickname)}'s profile, routines and notes from this device?</b><div class="row" style="justify-content:flex-start"><button class="abtn danger" data-a="delProfile">Delete profile</button><button class="abtn" data-a="cancelConfirm">Keep it</button></div></div>`
      : `<div><button class="abtn danger" data-a="confirm" data-v="profile">Delete profile…</button></div>`}</section>` : ''}
  </div>
  <aside class="preview"><h3>How a step looks</h3><div class="pv ${s.contrast === 'high' ? 'hc' : ''}">${prev}</div><small>Turn on the water, at the current picture detail and contrast.</small>
    <button class="abtn" data-a="previewLesson" data-v="hands">Try Washing hands as ${esc(p.nickname)}</button></aside></div>`;
}

function tabLessons(p: Profile): string {
  const rows = p.lessons.map((cfg, idx) => {
    const l = lessonById(cfg.id);
    if (!l) return '';
    const keep = cfg.steps || l.steps.map(x => x.k);
    const opt = l.id === 'teeth'
      ? `<div class="optline">${tog('o:teeth:pasteAssist', cfg.opts.pasteAssist, 'Mark toothpaste "With a grown-up"')}${tog('o:teeth:pasteHide', cfg.opts.pasteHide, 'Hide the toothpaste step')}</div>`
      : l.id === 'grocery' ? `<div class="optline">${tog('o:grocery:busy', cfg.opts.busy, 'Let the child choose a busy store (people and a sound marker)')}</div>`
      : l.id === 'classroom' ? `<small style="color:var(--muted)">For this child's real classroom, make a photo routine.</small>` : '';
    return `<div class="lrow ${cfg.on ? '' : 'off'}">
      <div class="ord"><button class="abtn sm" data-a="move" data-v="${idx}" data-d="-1" ${idx === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="abtn sm" data-a="move" data-v="${idx}" data-d="1" ${idx === p.lessons.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button></div>
      <div class="th">${svgWrap(l.icon(), 'mini')}</div>
      <div class="body"><h3>${l.title}</h3>
        <div class="stepchips" aria-label="Steps">${l.steps.filter(st => !st.requires && (!st.minLevel || cfg.level >= st.minLevel)).map(st => `<button data-a="stepTog" data-v="${l.id}" data-k="${st.k}" aria-pressed="${keep.includes(st.k)}">${st.title}</button>`).join('')}</div>
        ${l.levels ? `<div class="lvl"><span class="seg" role="group" aria-label="Difficulty">${LEVEL_NAMES.map((n, i) => `<button type="button" data-a="level" data-v="${l.id}" data-l="${i + 1}" aria-pressed="${cfg.level === i + 1}">${n}</button>`).join('')}</span><small>${esc(l.levels[cfg.level - 1])}</small></div>` : ''}
        ${opt}
        <div class="row" style="justify-content:flex-start;gap:8px">${l.short ? `<button class="abtn sm" data-a="shortVer" data-v="${l.id}">Short version</button>` : ''}<button class="abtn sm" data-a="allSteps" data-v="${l.id}">All steps</button></div></div>
      <div class="acts">${tog('on:' + l.id, cfg.on, cfg.on ? 'Shown' : 'Hidden')}<button class="abtn sm" data-a="previewLesson" data-v="${l.id}">Preview</button></div></div>`;
  }).join('');
  return `<div><h2>Activities for ${esc(p.nickname)}</h2><p class="lede">Turn activities on or off, set their order on the home screen, set how hard each one is, and choose which steps to show. A step that is crossed out is skipped.</p></div><div style="display:flex;flex-direction:column;gap:12px">${rows}</div>`;
}

function tabRoutines(p: Profile): string {
  if (view.draft) return routineBuilder(p);
  const mine = store.S.routines.filter(r => r.pid === p.id && r.id !== '__draft');
  return `<div style="display:flex;justify-content:space-between;align-items:end;gap:12px;flex-wrap:wrap"><div><h2>Photo routines</h2><p class="lede">Turn photos of ${esc(p.nickname)}'s real places into a step-by-step walkthrough. Photos stay on this device.</p></div>
    <button class="abtn primary" data-a="newRoutine">Create routine</button></div>
  ${mine.length ? `<div style="display:flex;flex-direction:column;gap:12px">${mine.map(r => `<div class="lrow ${r.on ? '' : 'off'}"><div></div><div class="th"><img src="${safeImg(r.steps[0]?.img)}" alt=""></div>
    <div class="body"><h3>${esc(r.name)} ${r.example ? '<span class="tag ex">Example</span>' : ''}</h3><small style="color:var(--muted)">${r.steps.length} steps · ${INTERACTION_LABEL[r.interaction]}${r.example ? ' · Drawings stand in for real photos' : ''}</small></div>
    <div class="acts">${tog('ron:' + r.id, r.on, r.on ? 'On home screen' : 'Hidden')}<div class="row" style="gap:8px"><button class="abtn sm" data-a="previewRoutine" data-v="${esc(r.id)}">Preview</button><button class="abtn sm" data-a="editRoutine" data-v="${esc(r.id)}">Edit</button></div></div></div>`).join('')}</div>`
  : `<p class="empty">No routines yet. Take 3 to 8 photos of a routine, like the walk from the car to the classroom, and add them here.</p>`}`;
}

export const draftReady = (name: string, n: number) => !!name.trim() && n >= 3 && n <= 8;

function routineBuilder(p: Profile): string {
  const d = view.draft!, n = d.steps.length, ok = draftReady(d.name, n);
  return `<div><h2>${d.id ? 'Edit routine' : 'Create routine'}</h2><p class="lede">Add 3 to 8 photos in order, give each a short caption, then preview it the way ${esc(p.nickname)} will see it.</p></div>
  <section class="group"><div class="field"><span>Routine name</span><input class="txt" id="rname" data-din="name" value="${esc(d.name)}" placeholder="Our school drop-off" maxlength="40"></div>
    <div class="field"><span>How the child moves on</span><div class="seg">${(Object.keys(INTERACTION_LABEL) as (keyof typeof INTERACTION_LABEL)[]).map(v => `<button type="button" data-a="dset" data-v="${v}" aria-pressed="${d.interaction === v}">${INTERACTION_LABEL[v]}</button>`).join('')}</div></div></section>
  <section class="group"><header><h3>Steps</h3><small style="color:var(--muted)">${n} of 8</small></header>
    <div class="rsteps">${d.steps.map((s, i) => `<div class="rstep"><span class="num">${i + 1}</span><img src="${safeImg(s.img)}" alt="Step ${i + 1}">
      <input class="txt" id="rcap${i}" data-dcap="${i}" value="${esc(s.cap)}" placeholder="Short caption, e.g. Hang up your coat." maxlength="60">
      <div class="ra"><button class="abtn sm" data-a="dmove" data-v="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="abtn sm" data-a="dmove" data-v="${i}" data-d="1" ${i === n - 1 ? 'disabled' : ''} aria-label="Move down">↓</button><button class="abtn sm danger" data-a="drem" data-v="${i}">Remove</button></div></div>`).join('')}</div>
    ${n < 8 ? `<label class="drop"><span>Add photos from this device</span><span class="abtn">Choose photos</span><input type="file" accept="image/*" multiple data-rfiles style="position:absolute;width:1px;height:1px;opacity:0"></label>` : ''}
    ${view.msg ? `<p class="err" style="color:var(--break);margin:0">${esc(view.msg)}</p>` : ''}</section>
  <div class="row" style="justify-content:flex-start"><button class="abtn primary" data-a="saveRoutine" ${ok ? '' : 'disabled'}>Save to ${esc(p.nickname)}'s activities</button>
    <button class="abtn" data-a="previewDraft" ${n ? '' : 'disabled'}>Preview</button><button class="abtn" data-a="cancelDraft">Cancel</button>
    ${d.id ? `<button class="abtn danger" data-a="delRoutine" style="margin-left:auto">Delete routine</button>` : ''}</div>
  ${!ok ? `<small style="color:var(--muted)">Needs a name and 3 to 8 photos before saving.</small>` : ''}`;
}

const fmt = (t: number) => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const refName = (ref: string) => lessonById(ref)?.title || store.S.routines.find(r => r.id === ref)?.name || 'Activity';

function tabNotes(p: Profile): string {
  const S = store.S;
  const ev = S.events.filter(e => e.pid === p.id).slice(0, 40), notes = S.notes.filter(n => n.pid === p.id);
  const acts: [string, string][] = [
    ...p.lessons.filter(x => lessonById(x.id)).map(x => [x.id, lessonById(x.id)!.title] as [string, string]),
    ...S.routines.filter(r => r.pid === p.id && r.id !== '__draft').map(r => [r.id, r.name] as [string, string]),
  ];
  return `<div><h2>Notes for ${esc(p.nickname)}</h2><p class="lede">What you noticed, in your words. Taps and time on screen are not treated as proof of learning, and nothing here is a score.</p></div>
  ${!p.settings.tracking ? `<div class="banner">Activity notes are off for ${esc(p.nickname)}. Nothing new is being recorded. <button class="abtn sm" data-a="tab" data-v="profiles">Change in profile</button></div>` : ''}
  <section class="group"><header><h3>Add an observation</h3></header>
    <form data-form="note" style="display:flex;flex-direction:column;gap:12px">
      <div class="field"><span>Activity</span><select class="txt" id="nref">${acts.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}<option value="other">Something else</option></select></div>
      <div class="field"><span>Support used</span><select class="txt" id="nsup"><option value="">Not noted</option><option>adult-assisted</option><option>prompted</option><option>independent</option></select></div>
      <div class="field"><span>What you saw</span><div class="checks">${OBSERVATIONS.map((o, i) => `<label><input type="checkbox" id="nobs${i}" value="${o}">${o}</label>`).join('')}</div></div>
      <div class="field"><span>In real life</span><textarea class="txt" id="ntext" placeholder="Was the practiced step easier or more familiar outside the app?"></textarea></div>
      <div><button class="abtn primary" type="submit">Save note</button></div></form></section>
  <section style="display:flex;flex-direction:column;gap:10px"><h3>Observations</h3>
    ${notes.length ? `<div class="notes">${notes.map(n => `<div class="note"><div class="meta"><b style="color:var(--ink)">${esc(refName(n.ref))}</b><span>${fmt(n.t)}</span>${n.support ? `<span class="tag">${esc(n.support)}</span>` : ''}${n.example ? '<span class="tag ex">Example</span>' : ''}<button class="abtn sm" style="margin-left:auto" data-a="delNote" data-v="${esc(n.id)}">Delete</button></div>${n.obs.length ? `<div class="meta">${n.obs.map(o => `<span>· ${esc(o)}</span>`).join('')}</div>` : ''}${n.text ? `<div>${esc(n.text)}</div>` : ''}</div>`).join('')}</div>` : `<p class="empty">No observations yet.</p>`}</section>
  <section style="display:flex;flex-direction:column;gap:10px"><h3>Activity log</h3><p class="lede" style="margin:0">Neutral labels only. Breaks, "no" and "all done" are choices, not failures.</p>
    ${ev.length ? `<div class="tablewrap"><table class="log"><thead><tr><th>When</th><th>Activity</th><th>What happened</th></tr></thead><tbody>${ev.map(e => `<tr><td class="t">${fmt(e.t)}</td><td>${esc(refName(e.ref))}</td><td>${EVENT_LABEL[e.type] || esc(e.type)}${e.example ? ' <span class="tag ex">Example</span>' : ''}</td></tr>`).join('')}</tbody></table></div>` : `<p class="empty">Nothing recorded yet.</p>`}</section>`;
}

function tabPrivacy(p: Profile): string {
  const S = store.S;
  const bytes = (() => { try { return new Blob([JSON.stringify(S)]).size; } catch { return 0; } })();
  return `<div><h2>Privacy & data</h2><p class="lede">Everything stays in this browser on this device. The app makes no network requests, has no ads, no analytics and no chat. Photos are never uploaded.</p></div>
  <section class="group"><header><h3>What is stored</h3><small style="color:var(--muted)">${(bytes / 1024).toFixed(0)} KB on this device</small></header>
    <div class="tablewrap"><table class="log"><tbody>
      <tr><td><b>Profiles</b></td><td>Nickname, sensory and display settings, activity order, communication card pictures</td><td class="t">${S.profiles.length}</td></tr>
      <tr><td><b>Photo routines</b></td><td>Photos (resized), captions, order</td><td class="t">${S.routines.length}</td></tr>
      <tr><td><b>Notes</b></td><td>Your observations and the neutral activity log</td><td class="t">${S.notes.length + S.events.length}</td></tr>
      <tr><td><b>Never collected</b></td><td>Birth dates, diagnoses, location, voice recordings, real names</td><td class="t">–</td></tr></tbody></table></div></section>
  <section class="group"><header><h3>Export</h3></header><p style="margin:0">Save everything as a JSON file to keep a backup or move it to another device.</p>
    <div class="row" style="justify-content:flex-start"><button class="abtn primary" data-a="download">Download JSON</button><button class="abtn" data-a="export">${view.exp ? 'Hide export' : 'Show export'}</button>${view.exp ? `<button class="abtn" data-a="copyExp">Copy</button><span id="copied" style="color:var(--muted)"></span>` : ''}</div>
    ${view.exp ? `<pre class="exp" id="expText">${esc(view.exp)}</pre>` : ''}</section>
  <section class="group"><header><h3>Delete</h3></header>
    ${view.confirm === 'notes' ? `<div class="confirm"><b>Delete all notes and the activity log for ${esc(p.nickname)}?</b><div class="row" style="justify-content:flex-start"><button class="abtn danger" data-a="delNotes">Delete notes</button><button class="abtn" data-a="cancelConfirm">Keep them</button></div></div>` : `<div><button class="abtn danger" data-a="confirm" data-v="notes">Delete ${esc(p.nickname)}'s notes…</button></div>`}
    ${view.confirm === 'all' ? `<div class="confirm"><b>Delete every profile, routine, photo and note on this device? This can't be undone.</b><div class="row" style="justify-content:flex-start"><button class="abtn danger" data-a="delAll">Delete everything</button><button class="abtn" data-a="cancelConfirm">Keep everything</button></div></div>` : `<div><button class="abtn danger" data-a="confirm" data-v="all">Delete everything…</button></div>`}
    <div><button class="abtn" data-a="restoreExamples">Load example profiles</button></div></section>`;
}

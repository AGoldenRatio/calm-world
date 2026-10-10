/* Audio only ever plays after a tap, and only when a grown-up turned it on. */
import { activeSettings } from './state';

export function speak(text: string): void {
  const s = activeSettings();
  if (!s.narration || !text) return;
  try {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = s.rate;
    u.volume = s.volume ?? 0.8;
    speechSynthesis.speak(u);
  } catch {
    /* speech is optional */
  }
}

let actx: AudioContext | null = null;

/** Soft running water: low-passed noise with slow fades in and out. */
export function waterSound(): void {
  const s = activeSettings();
  if (!s.envAudio) return;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    actx = actx || new Ctor();
    const len = actx.sampleRate * 1.6, buf = actx.createBuffer(1, len, actx.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const src = actx.createBufferSource();
    src.buffer = buf;
    const lp = actx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const g = actx.createGain();
    const t = actx.currentTime, v = 0.25 * s.volume;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.4);
    g.gain.linearRampToValueAtTime(v, t + 1.1);
    g.gain.linearRampToValueAtTime(0, t + 1.6);
    src.connect(lp).connect(g).connect(actx.destination);
    src.start();
  } catch {
    /* sound is optional */
  }
}

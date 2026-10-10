/* Symbol library. Every drawing is an SVG fragment in a 600 x 400 viewBox with the floor at y=350.
   Classes (.l, .f, .f2, .soft, …) are themed by CSS tokens, so one drawing serves standard, dark and high contrast. */

export type Detail = 0 | 1 | 2;
export type Bg = 'bath' | 'class' | 'store' | 'room';
export type ColorName = 'red' | 'blue' | 'yellow' | 'green';
export type ItemName = 'apple' | 'bread' | 'milk';
export type AacKey = 'help' | 'break' | 'no' | 'done';

const pts = (arr: number[][], f: (p: number[]) => string) => arr.map(f).join('');

export const D = {
  floor: () => `<line class="l faint" x1="30" y1="350" x2="570" y2="350"/>`,
  tiles: () => {
    let s = '';
    for (let x = 40; x < 560; x += 60) for (let y = 24; y < 230; y += 60) s += `<rect class="wall" x="${x}" y="${y}" width="56" height="56" rx="4"/>`;
    return s;
  },
  window: (x: number, y: number) =>
    `<g><rect class="l f2" x="${x}" y="${y}" width="120" height="90" rx="6"/><line class="l" x1="${x + 60}" y1="${y}" x2="${x + 60}" y2="${y + 90}"/><line class="l" x1="${x}" y1="${y + 45}" x2="${x + 120}" y2="${y + 45}"/></g>`,
  shelf: (x: number, y: number, w: number) =>
    `<g class="faint"><rect class="l n" x="${x}" y="${y}" width="${w}" height="230"/>${[y + 75, y + 150].map(v => `<line class="l" x1="${x}" y1="${v}" x2="${x + w}" y2="${v}"/>`).join('')}${[0, 1, 2].map(r => [0, 1].map(c => `<rect class="l f2" x="${x + 12 + c * (w / 2)}" y="${y + 28 + r * 75}" width="${w / 2 - 24}" height="44" rx="4"/>`).join('')).join('')}</g>`,
  counter: () => `<rect class="l f2" x="60" y="238" width="480" height="24" rx="5"/>`,
  sink: (x: number, y: number) =>
    `<g><rect class="l f2" x="${x - 170}" y="${y - 12}" width="340" height="24" rx="6"/><path class="l f" d="M${x - 110} ${y + 12} h220 q0 80 -80 80 h-60 q-80 0 -80 -80z"/></g>`,
  faucet: (x: number, y: number) =>
    `<g><path class="l n pipe" d="M${x} ${y} v-60 q0 -18 18 -18 h40 v26"/><rect class="l f2" x="${x - 28}" y="${y - 96}" width="56" height="16" rx="8"/></g>`,
  water: (x: number, y: number, h: number) => `<rect class="water drip" x="${x - 10}" y="${y}" width="20" height="${h}" rx="10"/>`,
  hand: (x: number, y: number, sx = 1, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${sx * s} ${s})"><path class="l f" d="M-30 50 v-70 q0 -30 30 -30 q30 0 30 30 v70 z"/><path class="l f" d="M-30 4 q-30 -4 -34 -30 q-2 -14 12 -14 q12 2 22 24"/></g>`,
  hands: (x: number, y: number) => D.hand(x - 42, y, 1) + D.hand(x + 42, y, -1),
  bubbles: (x: number, y: number) =>
    pts([[0, 0, 14], [-34, -20, 10], [30, -26, 12], [10, -50, 8], [-18, -58, 9], [44, 8, 8]], ([a, b, r]) => `<circle class="l bubble" cx="${x + a}" cy="${y + b}" r="${r}"/>`),
  drops: (x: number, y: number) =>
    pts([[-62, -30], [62, -40], [0, -70]], ([a, b]) => `<path class="water l" style="stroke-width:3px" d="M${x + a} ${y + b} q-9 14 0 20 q9 -6 0 -20z"/>`),
  soap: (x: number, y: number) =>
    `<g><rect class="l soft" x="${x - 34}" y="${y - 60}" width="68" height="90" rx="14"/><rect class="l f" x="${x - 10}" y="${y - 84}" width="20" height="24"/><path class="l n" d="M${x - 26} ${y - 88} h36"/></g>`,
  towel: (x: number, y: number) =>
    `<g><line class="l" x1="${x - 75}" y1="${y}" x2="${x + 75}" y2="${y}"/><rect class="l towel" x="${x - 55}" y="${y}" width="110" height="130" rx="6"/><line class="l" x1="${x - 55}" y1="${y + 104}" x2="${x + 55}" y2="${y + 104}"/></g>`,
  brush: (x: number, y: number, rot = 0, paste = false) =>
    `<g transform="translate(${x} ${y}) rotate(${rot})"><rect class="l soft" x="-110" y="-12" width="170" height="24" rx="12"/><rect class="l f" x="56" y="-14" width="60" height="28" rx="8"/>${[66, 80, 94, 108].map(b => `<line class="l" x1="${b}" y1="-14" x2="${b}" y2="-32"/>`).join('')}${paste ? `<path class="l paste" d="M58 -34 q30 -24 60 0 z"/>` : ''}</g>`,
  tube: (x: number, y: number) =>
    `<g transform="rotate(20 ${x} ${y})"><path class="l f" d="M${x - 80} ${y - 26} h140 l20 14 v24 l-20 14 h-140 q-12 -26 0 -52z"/><rect class="l f2" x="${x + 80}" y="${y - 12}" width="26" height="24" rx="4"/><line class="l" x1="${x - 60}" y1="${y}" x2="${x + 20}" y2="${y}"/></g>`,
  mouth: (x: number, y: number) =>
    `<g><path class="l mouth" d="M${x - 130} ${y - 30} q130 140 260 0 q-130 36 -260 0z"/>${[-92, -52, -12, 28, 68].map(a => `<rect class="l f" x="${x + a}" y="${y - 20}" width="34" height="28" rx="6"/>`).join('')}</g>`,
  cup: (x: number, y: number) => `<path class="l f2" d="M${x - 40} ${y - 60} h80 l-10 110 h-60z"/>`,
  door: (x: number, y: number, open: boolean) =>
    open
      ? `<g><rect class="l" style="fill:var(--accent-soft)" x="${x - 60}" y="${y - 200}" width="120" height="200"/><path class="l f2" d="M${x - 60} ${y - 200} l-44 22 v166 l44 12z"/></g>`
      : `<g><rect class="l f2" x="${x - 60}" y="${y - 200}" width="120" height="200" rx="4"/><rect class="l f" x="${x - 36}" y="${y - 176}" width="72" height="56" rx="4"/><circle class="l f" cx="${x + 38}" cy="${y - 96}" r="8"/></g>`,
  star: (x: number, y: number, r: number) => {
    const p: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      p.push((x + rr * Math.cos(a)).toFixed(1) + ',' + (y + rr * Math.sin(a)).toFixed(1));
    }
    return `<polygon class="l cy" points="${p.join(' ')}"/>`;
  },
  cubby: (x: number, y: number) => {
    let s = '';
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) s += `<rect class="l f2" x="${x - 150 + c * 100}" y="${y - 190 + r * 95}" width="100" height="95"/>`;
    return `<g>${s}${D.star(x, y - 168, 14)}</g>`;
  },
  bag: (x: number, y: number, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path class="l n" d="M-24 -70 q0 -26 24 -26 q24 0 24 26"/><rect class="l bag" x="-50" y="-70" width="100" height="120" rx="26"/><rect class="l f" x="-32" y="2" width="64" height="36" rx="10"/></g>`,
  desk: (x: number, y: number) =>
    `<g><line class="l" x1="${x - 170}" y1="${y - 60}" x2="${x - 170}" y2="${y}"/><line class="l" x1="${x + 170}" y1="${y - 60}" x2="${x + 170}" y2="${y}"/><path class="l wood" d="M${x - 150} ${y - 110} h300 l40 50 h-380z"/></g>`,
  paper: (x: number, y: number, mark: boolean) =>
    `<g><path class="l f" d="M${x - 52} ${y - 100} h104 l10 32 h-124z"/>${mark ? `<path class="mark" d="M${x - 38} ${y - 82} q12 -10 24 0 t24 0 t24 0"/>` : ''}</g>`,
  store: (x: number, y: number, open: boolean) => {
    let aw = '';
    for (let i = 0; i < 7; i++) aw += `<rect class="l ${i % 2 ? 'f' : 'cb'}" x="${x - 210 + i * 60}" y="${y - 262}" width="60" height="40"/>`;
    return `<g><rect class="l f2" x="${x - 200}" y="${y - 222}" width="400" height="222"/>${aw}${D.door(x, y, open)}<rect class="l f" x="${x - 180}" y="${y - 180}" width="90" height="90" rx="4"/><rect class="l f" x="${x + 90}" y="${y - 180}" width="90" height="90" rx="4"/></g>`;
  },
  basket: (x: number, y: number) =>
    `<g><path class="l n" d="M${x - 60} ${y - 50} q60 -80 120 0"/><path class="l soft" d="M${x - 80} ${y - 50} h160 l-20 90 h-120z"/><line class="l" x1="${x - 72}" y1="${y - 18}" x2="${x + 72}" y2="${y - 18}"/><line class="l" x1="${x - 65}" y1="${y + 12}" x2="${x + 65}" y2="${y + 12}"/></g>`,
  apple: (x: number, y: number, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><circle class="l cr" cx="0" cy="0" r="34"/><path class="l n" d="M0 -32 q4 -16 12 -22"/><path class="l cg" d="M8 -42 q20 -18 34 -4 q-18 16 -34 4z"/></g>`,
  bread: (x: number, y: number, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path class="l wood" d="M-52 30 v-36 q0 -32 52 -32 q52 0 52 32 v36z"/><path class="l n" d="M-24 -14 l10 -14 M0 -14 l10 -14 M24 -14 l10 -14"/></g>`,
  milk: (x: number, y: number, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path class="l f" d="M-30 46 v-76 l14 -22 h32 l14 22 v76z"/><rect class="l cb" x="-30" y="-6" width="60" height="26"/></g>`,
  register: (x: number, y: number) =>
    `<g><rect class="l f2" x="${x - 140}" y="${y - 100}" width="280" height="100" rx="6"/><rect class="belt" x="${x - 130}" y="${y - 112}" width="160" height="12" rx="6"/><line class="l" x1="${x + 90}" y1="${y - 100}" x2="${x + 90}" y2="${y - 120}"/><rect class="l f" x="${x + 50}" y="${y - 176}" width="80" height="58" rx="6"/></g>`,
  person: (x: number, y: number, s = 1) =>
    `<g class="crowd" transform="translate(${x} ${y}) scale(${s})"><circle class="l f2" cx="0" cy="-140" r="24"/><path class="l f2" d="M-36 0 v-76 q0 -36 36 -36 q36 0 36 36 v76z"/></g>`,
  sound: (x: number, y: number) =>
    `<g><path class="l f2" d="M${x - 24} ${y - 12} h14 l18 -16 v56 l-18 -16 h-14z"/><path class="l n" d="M${x + 18} ${y - 4} q10 16 0 32 M${x + 30} ${y - 16} q20 28 0 56"/></g>`,
  puzzle: (x: number, y: number, missing = true) =>
    [[0, 0], [1, 0], [0, 1], [1, 1]]
      .map(([c, r], i) =>
        missing && i === 3
          ? `<rect class="l n" style="stroke-dasharray:10 12" x="${x - 70 + c * 70}" y="${y - 70 + r * 70}" width="70" height="70"/>`
          : `<rect class="l ${['cb', 'cy', 'cg', 'cr'][i]}" x="${x - 70 + c * 70}" y="${y - 70 + r * 70}" width="70" height="70"/>`)
      .join(''),
  couch: (x: number, y: number) =>
    `<g><rect class="l soft" x="${x - 100}" y="${y - 150}" width="200" height="80" rx="22"/><rect class="l soft" x="${x - 120}" y="${y - 80}" width="240" height="70" rx="20"/><rect class="l soft" x="${x - 150}" y="${y - 115}" width="44" height="115" rx="18"/><rect class="l soft" x="${x + 106}" y="${y - 115}" width="44" height="115" rx="18"/></g>`,
  box: (x: number, y: number) =>
    `<g><rect class="l wood" x="${x - 90}" y="${y - 100}" width="180" height="100" rx="4"/><rect class="l wood" x="${x - 100}" y="${y - 124}" width="200" height="28" rx="4"/></g>`,
  ball: (x: number, y: number, c: string, r = 90) =>
    `<g><circle class="l c-${c}" cx="${x}" cy="${y}" r="${r}"/><path class="l n" style="opacity:.6" d="M${x - r * 0.55} ${y - r * 0.25} q${r * 0.15} ${-r * 0.4} ${r * 0.5} ${-r * 0.45}"/></g>`,
  colorThing: (c: ColorName, x: number, y: number): string =>
    ({
      red: D.apple(x, y, 1.4),
      blue: `<g transform="translate(${x} ${y})"><path class="l cb" d="M-46 -66 h92 l-12 120 h-68z"/><path class="l n" d="M46 -40 q34 0 30 34 q-4 26 -36 26"/></g>`,
      yellow: `<g transform="translate(${x} ${y})"><path class="l cy" d="M-80 -20 q80 90 160 0 q-80 40 -160 0z"/></g>`,
      green: `<g transform="translate(${x} ${y})"><path class="l cg" d="M-70 30 q10 -100 120 -90 q-10 110 -120 90z"/><path class="l n" d="M-60 22 q50 -40 100 -72"/></g>`,
    })[c],
  banana: (x: number, y: number, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path class="l cy" d="M-56 -14 q56 70 112 0 q-56 34 -112 0z"/><path class="l n" d="M50 -10 l10 -14"/></g>`,
  carrot: (x: number, y: number, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path class="l co" d="M-16 -30 h32 l-16 74z"/><path class="l cg" d="M-4 -30 q-14 -22 -4 -30 q10 10 4 30z M4 -30 q14 -22 4 -30 q-10 10 -4 30z"/><path class="l n" d="M-8 -6 h8 M-4 12 h6"/></g>`,
  cheese: (x: number, y: number, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path class="l cy" d="M-52 30 v-40 l104 -22 v62z"/><circle class="f2" cx="-20" cy="6" r="8"/><circle class="f2" cx="20" cy="-6" r="6"/><circle class="f2" cx="30" cy="16" r="5"/></g>`,
  eggs: (x: number, y: number, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><ellipse class="l f" cx="-30" cy="-6" rx="18" ry="24"/><ellipse class="l f" cx="0" cy="-10" rx="18" ry="24"/><ellipse class="l f" cx="30" cy="-6" rx="18" ry="24"/><rect class="l f2" x="-56" y="0" width="112" height="34" rx="6"/></g>`,
  cereal: (x: number, y: number, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><rect class="l cy" x="-36" y="-52" width="72" height="100" rx="4"/><path class="l f" d="M-22 8 h44 q0 24 -22 24 q-22 0 -22 -24z"/><circle class="l wood" cx="-8" cy="2" r="6"/><circle class="l wood" cx="8" cy="0" r="6"/></g>`,
  item: (v: string | undefined, x: number, y: number, s = 1): string => {
    const f = ({ bread: D.bread, milk: D.milk, banana: D.banana, carrot: D.carrot, cheese: D.cheese, eggs: D.eggs, cereal: D.cereal } as Record<string, typeof D.apple>)[v ?? ''];
    return (f ?? D.apple)(x, y, s);
  },
  /** A painted wooden block standing on y. */
  block: (x: number, y: number, color: string, w = 120, h = 56) => {
    const cls = ({ wood: 'wood', red: 'cr', blue: 'cb', yellow: 'cy', green: 'cg' } as Record<string, string>)[color] ?? 'wood';
    return `<g><rect class="l ${cls}" x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="6"/><path class="grain" d="M${x - w / 2 + 14} ${y - h / 2 - 4} q${w / 4} -8 ${w / 2 - 14} 0 t${w / 2 - 14} 2 M${x - w / 2 + 24} ${y - 14} q${w / 4} 6 ${w / 2} 0"/></g>`;
  },
  /** Blocks stacked from the floor (y=350) upward. */
  tower: (x: number, blocks: string[], floor = 350, w = 120, h = 56) => blocks.map((c, i) => D.block(x, floor - i * h, c, w, h)).join(''),
  spoon: (x: number, y: number, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s}) rotate(-30)"><ellipse class="l f2" cx="0" cy="-60" rx="26" ry="36"/><rect class="l f2" x="-8" y="-26" width="16" height="110" rx="8"/></g>`,
  comb: (x: number, y: number, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><rect class="l soft" x="-100" y="-30" width="200" height="26" rx="8"/>${[-84, -64, -44, -24, -4, 16, 36, 56, 76].map(a => `<line class="l" x1="${a}" y1="-4" x2="${a}" y2="30"/>`).join('')}</g>`,
  shape: (k: string, x: number, y: number, r = 44) =>
    k === 'star' ? D.star(x, y, r)
    : k === 'circle' ? `<circle class="l cb" cx="${x}" cy="${y}" r="${r * 0.8}"/>`
    : k === 'triangle' ? `<path class="l cg" d="M${x} ${y - r} L${x + r} ${y + r * 0.75} H${x - r}z"/>`
    : `<rect class="l cr" x="${x - r * 0.75}" y="${y - r * 0.75}" width="${r * 1.5}" height="${r * 1.5}" rx="4"/>`,
  /** One cubby with a shape label. */
  cubbyMark: (k: string) => `<rect class="l f2" x="190" y="90" width="220" height="230" rx="6"/><rect class="l f" x="250" y="110" width="100" height="70" rx="6"/>${D.shape(k, 300, 145, 26)}`,
  paperBag: (x: number, y: number) => `<g><path class="l wood" d="M${x - 80} ${y} v-150 h160 v150z"/><path class="l n" d="M${x - 80} ${y - 150} l20 -16 h120 l20 16"/></g>`,
  cardReader: (x: number, y: number, paid: boolean) =>
    `<g><rect class="l f2" x="${x - 60}" y="${y - 150}" width="120" height="150" rx="14"/><rect class="l f" x="${x - 42}" y="${y - 132}" width="84" height="52" rx="6"/>${paid ? `<path class="mark" d="M${x - 18} ${y - 106} l14 14 l26 -28"/>` : ''}</g>`,
  card: (x: number, y: number) => `<g><rect class="l cb" x="${x - 60}" y="${y - 38}" width="120" height="76" rx="10"/><rect class="l f" x="${x - 46}" y="${y - 18}" width="26" height="20" rx="3"/></g>`,
  listPaper: (items: string[]) =>
    `<g><path class="l f" d="M200 40 h200 v320 h-200z"/>${items.map((v, i) => `${D.item(v, 260, 100 + i * 100, 0.7)}<line class="l faint" x1="310" y1="${100 + i * 100}" x2="370" y2="${100 + i * 100}"/>`).join('')}</g>`,
  noSign: () =>
    `<circle class="l n" style="stroke-width:24px" cx="300" cy="200" r="120"/><line class="l" style="stroke-width:24px" x1="215" y1="285" x2="385" y2="115"/>`,
  doneBox: () => `<rect class="l f2" x="180" y="110" width="240" height="190" rx="18"/><path class="l n" style="stroke-width:24px" d="M236 206 l46 46 l86 -100"/>`,
};

/** Room behind a scene. Minimal detail draws nothing, so the focal object stands alone. */
export function BG(kind: Bg, d: Detail): string {
  let s = '';
  if (d >= 2) {
    if (kind === 'bath') s += D.tiles();
    if (kind === 'class') s += D.window(40, 40) + `<rect class="l board" x="210" y="34" width="340" height="120" rx="6"/>`;
    if (kind === 'store') s += D.shelf(14, 110, 110) + D.shelf(476, 110, 110);
    if (kind === 'room') s += D.window(450, 40);
  }
  if (d >= 1) s += D.floor();
  return s;
}

/** Communication cards. Adults can replace any picture with the child's own AAC symbol. */
export const AAC: Record<AacKey, { label: string; draw: () => string }> = {
  help: { label: 'Help', draw: () => `<g transform="translate(300 220) scale(2.3)">${D.hand(0, 0)}</g>` },
  break: { label: 'Break', draw: () => D.couch(300, 320) },
  no: { label: 'No', draw: () => D.noSign() },
  done: { label: 'All done', draw: () => D.doneBox() },
};
export const AAC_KEYS = Object.keys(AAC) as AacKey[];

export const svgWrap = (inner: string, cls = '') => `<svg viewBox="0 0 600 400" class="${cls}" aria-hidden="true">${inner}</svg>`;

/** A drawing as a standalone image (fixed light palette), used where a photo would go. */
export function svgImg(inner: string): string {
  const css = `.l{stroke:#24343B;stroke-width:5px;stroke-linejoin:round;stroke-linecap:round}.f{fill:#fff}.f2{fill:#DDE4E6}.soft{fill:#C9D9DC}.n{fill:none}.wood{fill:#CFAE84}.cy{fill:#E6B52A}.cb{fill:#2E60B0}.bag{fill:#2E60B0}.mark{stroke:#23626C;stroke-width:7px;fill:none;stroke-linecap:round}.faint{opacity:.35}.board{fill:#D2E4E5}.belt{fill:#24343B;opacity:.5}.cr{fill:#C63F38}.cg{fill:#3C874D}.co{fill:#E07A2E}.grain{fill:none;stroke:#24343B;stroke-width:2px;opacity:.3}`;
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><style>${css}</style><rect width="600" height="400" fill="#EFEBE2"/>${D.floor()}${inner}</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
}

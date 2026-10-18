// Renders the static assets for the mobile videos: phone-bezel overlays (transparent screen hole) for
// portrait and landscape, and the end cards.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const out = new URL('../build/mobile/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

export const LAYOUT = {
  portrait: { W: 1080, H: 1920, sw: 814, sh: 1760, sx: 133, sy: 80, bezel: 18, radius: 58 },
  landscape: { W: 1920, H: 1080, sw: 444, sh: 960, sx: 738, sy: 60, bezel: 14, radius: 34 },
};
writeFileSync(out + 'layout.json', JSON.stringify(LAYOUT));

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Newsreader:opsz,wght@6..72,500&display=block" rel="stylesheet">`;
const MARK = (s) => `<span style="display:inline-grid;place-items:center;width:${s}px;height:${s}px;border-radius:${s * 0.24}px;background:#0F6E5F"><svg width="${s * 0.55}" height="${s * 0.55}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></span>`;

function bezel(L, extra = '') {
  return `<!doctype html><html><head>${FONTS}<style>
html,body{margin:0;width:${L.W}px;height:${L.H}px;background:transparent;overflow:hidden;font-family:'Instrument Sans',system-ui,sans-serif}
.hole{position:absolute;left:${L.sx}px;top:${L.sy}px;width:${L.sw}px;height:${L.sh}px;border-radius:${L.radius}px;
box-shadow:0 0 0 ${L.bezel}px #16232A,0 0 0 ${L.bezel + 1}px #2b3a40,0 0 0 6000px #EEF1EF}
</style></head><body><div class="hole"></div>${extra}</body></html>`;
}

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1920, height: 1920 }, deviceScaleFactor: 1 })).newPage();
async function shot(html, W, H, file, transparent) {
  await p.setViewportSize({ width: W, height: H });
  await p.setContent(html);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.screenshot({ path: out + file, omitBackground: transparent, clip: { x: 0, y: 0, width: W, height: H } });
}

const P = LAYOUT.portrait, Ls = LAYOUT.landscape;
await shot(bezel(P), P.W, P.H, 'bezel-portrait.png', true);
const title = `<div style="position:absolute;left:120px;top:0;height:${Ls.H}px;width:520px;display:flex;flex-direction:column;justify-content:center;gap:22px;color:#14212A">
  <div style="display:flex;align-items:center;gap:16px;font:600 30px 'Instrument Sans'">${MARK(52)} Closing Copilot</div>
  <div style="font:500 72px/1.02 'Newsreader',serif;letter-spacing:-1px">On your phone.</div>
  <div style="font:400 28px/1.4 'Instrument Sans';color:#4a5a60">Deadlines, customers and bookings between viewings. Installable on iPhone and Android.</div>
</div>`;
await shot(bezel(Ls, title), Ls.W, Ls.H, 'bezel-landscape.png', true);

const endCard = (W, H, big) => `<!doctype html><html><head>${FONTS}<style>
html,body{margin:0;width:${W}px;height:${H}px;background:#EEF1EF;font-family:'Instrument Sans',sans-serif;color:#14212A}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:${big ? 40 : 28}px;padding:0 80px}
h1{margin:0;font:500 ${big ? 120 : 112}px/1 'Newsreader',serif;letter-spacing:-2px}
.t{font:500 ${big ? 54 : 46}px/1.25 'Newsreader',serif;color:#0F6E5F}
.s{font:500 ${big ? 36 : 32}px/1.4 'Instrument Sans';color:#4a5a60}
</style></head><body><div class="c">${MARK(big ? 110 : 96)}<h1>Closing Copilot</h1><div class="t">works in your pocket.</div><div class="s">Installable on iPhone and Android.</div></div></body></html>`;
await shot(endCard(P.W, P.H, true), P.W, P.H, 'end-portrait.png', false);
await shot(endCard(Ls.W, Ls.H, false), Ls.W, Ls.H, 'end-landscape.png', false);
await b.close();

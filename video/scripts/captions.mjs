// Renders lower-third caption pills as transparent PNGs (ffmpeg here has no drawtext).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const out = new URL('../build/captions/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
export const CAPTIONS = {
  docai: 'Document AI + Gemini',
  mismatch: 'Mismatch caught before signing',
  confirm: 'Agent confirms before saving',
  pdpa: 'With consent (PDPA)',
  adk: 'ADK agent · tools, not guesses',
};
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1200, height: 200 }, deviceScaleFactor: 1 })).newPage();
for (const [k, text] of Object.entries(CAPTIONS)) {
  await p.setContent(`<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@500;600&display=block" rel="stylesheet">
<style>html,body{margin:0;background:transparent}
.pill{display:inline-flex;align-items:center;gap:14px;margin:12px;padding:16px 28px 16px 22px;border-radius:999px;
background:rgba(16,40,38,.92);color:#fff;font:600 32px/1 'Instrument Sans',system-ui,sans-serif;letter-spacing:.2px;
box-shadow:0 6px 24px rgba(0,0,0,.18)}
.dot{width:30px;height:30px;border-radius:8px;background:#0F6E5F;display:grid;place-items:center}
</style></head><body><span class="pill"><span class="dot"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></span>${text}</span></body></html>`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.locator('.pill').screenshot({ path: `${out}${k}.png`, omitBackground: true });
}
await b.close();

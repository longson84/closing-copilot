import { chromium } from 'playwright';
const deck = new URL('../../deck/deck.html', import.meta.url).href;
const out = new URL('../build/', import.meta.url).pathname;
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
await p.goto(deck, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);
const slides = p.locator('section.slide');
for (const [i, name] of [[0, 'card-title'], [9, 'card-arch']]) {
  const s = slides.nth(i);
  await s.scrollIntoViewIfNeeded();
  await s.screenshot({ path: `${out}${name}.png` });
}
await b.close();

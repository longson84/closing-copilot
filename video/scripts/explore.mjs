import { chromium } from 'playwright';
const BASE = 'https://closing-copilot-898383619830.asia-southeast1.run.app';
const out = new URL('../build/explore/', import.meta.url).pathname;
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
for (const [n, h] of [['pipeline', '#/'], ['customers', '#/customers'], ['reminders', '#/reminders'], ['new', '#/new']]) {
  await p.goto(BASE + '/' + h); await p.waitForTimeout(3500);
  await p.screenshot({ path: out + n + '.png' });
  if (n === 'pipeline') console.log(await p.locator('.main').innerText());
  if (n === 'customers') console.log(await p.locator('.main a[href^="#/customers/"]').evaluateAll(as => as.map(a => a.getAttribute('href') + ' ' + a.textContent.slice(0, 40))));
}
await b.close();

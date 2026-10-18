// Mobile (iPhone-like) demo recording. Captures frames with a CDP screencast at DPR 3 (1170x2532, sharp),
// each frame stamped with its capture time, plus a marks JSON on the same clock.
// Usage: node scripts/record-mobile.mjs m1 m2 m3 m4 m5
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const OUT = join(here, '..', 'build', 'mraw');
const DOCS = join(ROOT, 'demo-docs');
const BASE = 'https://closing-copilot-898383619830.asia-southeast1.run.app/';
mkdirSync(OUT, { recursive: true });

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

// Visible touch indicator (no mouse cursor on a phone).
const TOUCH = `
(() => {
  const show = (x, y) => {
    const d = document.createElement('div');
    Object.assign(d.style, { position: 'fixed', left: x - 22 + 'px', top: y - 22 + 'px', width: '44px', height: '44px', borderRadius: '50%',
      background: 'rgba(15,110,95,.28)', border: '2px solid rgba(15,110,95,.85)', zIndex: 2147483647, pointerEvents: 'none',
      transform: 'scale(.6)', opacity: '1', transition: 'transform .45s ease-out, opacity .55s ease-out' });
    document.documentElement.appendChild(d);
    requestAnimationFrame(() => requestAnimationFrame(() => { d.style.transform = 'scale(1.25)'; d.style.opacity = '0'; }));
    setTimeout(() => d.remove(), 700);
  };
  addEventListener('touchstart', (e) => { for (const t of e.changedTouches) show(t.clientX, t.clientY); }, { capture: true, passive: true });
  // The iOS "Add to Home Screen" hint would cover the tab bar in a fresh context; mark it dismissed.
  try { localStorage.setItem('cc.iosInstallHintDismissed', '1'); } catch {}
})();`;

async function scene(name, fn) {
  const browser = await chromium.launch({ args: ['--force-device-scale-factor=3'] });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: UA,
  });
  await ctx.addInitScript(TOUCH);
  const page = await ctx.newPage();
  const dir = join(OUT, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    const i = frames.length;
    const file = `${String(i).padStart(5, '0')}.jpg`;
    writeFileSync(join(dir, file), Buffer.from(f.data, 'base64'));
    frames.push({ file, t: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1170, maxHeight: 2532, everyNthFrame: 1 });
  const marks = {};
  const mark = (k) => { marks[k] = Date.now() / 1000; console.log(`  [${name}] ${k}`); };
  const h = {
    page,
    mark,
    wait: (ms) => page.waitForTimeout(ms),
    async tap(loc, pause = 350) {
      await loc.waitFor({ state: 'visible' });
      await loc.evaluate((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < 60 || r.bottom > innerHeight - 90) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      await page.waitForTimeout(pause);
      await loc.tap();
      await page.waitForTimeout(300);
    },
    async scroll(dy, ms = 900, sel = null) {
      await page.evaluate(({ dy, sel }) => {
        const el = sel ? document.querySelector(sel) : document.scrollingElement;
        el.scrollBy({ top: dy, behavior: 'smooth' });
      }, { dy, sel });
      await page.waitForTimeout(ms);
    },
    async reveal(loc, block = 'center') {
      await loc.evaluate((el, block) => el.scrollIntoView({ behavior: 'smooth', block }), block);
      await page.waitForTimeout(900);
    },
    async type(loc, text) {
      await h.tap(loc);
      await loc.pressSequentially(text, { delay: 55 });
    },
    async files(trigger, paths) {
      const fc = page.waitForEvent('filechooser');
      await h.tap(trigger);
      await (await fc).setFiles(paths);
    },
  };
  try {
    await fn(h);
  } catch (e) {
    await page.screenshot({ path: join(OUT, `${name}-error.png`) });
    throw e;
  } finally {
    mark('end');
    await page.waitForTimeout(300);
    await cdp.send('Page.stopScreencast').catch(() => {});
    await ctx.close();
    await browser.close();
    writeFileSync(join(OUT, `${name}.json`), JSON.stringify({ marks, frames }, null, 0));
    console.log(`  [${name}] ${frames.length} frames`);
  }
}

const go = async (h, hash, sel) => {
  await h.page.goto(BASE + hash);
  await h.page.locator(sel + ' >> visible=true').first().waitFor({ timeout: 30000 });
  await h.page.evaluate(() => document.fonts.ready);
  await h.wait(800);
};
const lastAiDone = (page) =>
  page.waitForFunction(() => !document.querySelector('.copilot-foot .chip')?.disabled, null, { timeout: 180000 });
const aiText = (page) =>
  page.waitForFunction(() => {
    const m = [...document.querySelectorAll('.copilot .msg-ai')].pop();
    return m && m.querySelector('p, li');
  }, null, { timeout: 120000 });

const SCENES = {
  // Home -> Lee Jun Hao's overdue deal -> vertical timeline
  async m1(h) {
    const { page } = h;
    await go(h, '#/', 'text=LEE JUN HAO');
    h.mark('ready');
    await h.wait(1000);
    await h.scroll(0, 0);
    await page.evaluate(() => document.querySelector('.today')?.scrollBy({ left: 260, behavior: 'smooth' }));
    await h.wait(1200);
    await page.evaluate(() => document.querySelector('.today')?.scrollBy({ left: -260, behavior: 'smooth' }));
    await h.wait(1000);
    await h.tap(page.locator('.deal-card', { hasText: 'LEE JUN HAO' }).first());
    await page.locator('h2', { hasText: 'Closing timeline' }).waitFor({ timeout: 30000 });
    await h.wait(1200);
    await h.scroll(360, 1400);
    await h.wait(900);
  },

  // Copilot sheet on the deal -> "Draft a reminder to the buyer"
  async m2(h) {
    const { page } = h;
    await go(h, '#/', 'text=LEE JUN HAO');
    await page.locator('.deal-card', { hasText: 'LEE JUN HAO' }).first().tap();
    await page.locator('h2', { hasText: 'Closing timeline' }).waitFor({ timeout: 30000 });
    await h.wait(900);
    h.mark('ready');
    await h.tap(page.locator('.tabbar').getByRole('button', { name: 'Copilot' }));
    await h.wait(900);
    const chip = page.locator('.copilot-foot .chip', { hasText: 'Draft a reminder to the buyer' });
    await h.tap(chip);
    h.mark('ai_start');
    await aiText(page);
    h.mark('ai_text');
    await lastAiDone(page);
    h.mark('ai_end');
    await h.wait(600);
    await page.locator('.copilot-body').evaluate((el) => el.scrollTo({ top: 0, behavior: 'smooth' }));
    await h.wait(1200);
    const sh = await page.locator('.copilot-body').evaluate((el) => el.scrollHeight - el.clientHeight);
    await h.scroll(sh, Math.min(4000, 800 + sh * 4), '.copilot-body');
    await h.wait(1200);
  },

  // Reminders -> Joanne's birthday -> Send wishes
  async m3(h) {
    const { page } = h;
    await go(h, '#/', 'text=LEE JUN HAO');
    h.mark('ready');
    await h.tap(page.locator('.tabbar').getByRole('link', { name: 'Reminders' }));
    await page.locator('h1', { hasText: 'Reminders' }).waitFor();
    await h.wait(900);
    const row = page.locator('.rem-list li', { hasText: 'Joanne' }).filter({ has: page.getByRole('button', { name: 'Send wishes' }) }).first();
    await h.reveal(row);
    await h.wait(900);
    await h.tap(row.getByRole('button', { name: 'Send wishes' }));
    h.mark('ai_start');
    await aiText(page);
    h.mark('ai_text');
    await lastAiDone(page);
    h.mark('ai_end');
    await h.wait(2500);
  },

  // Customers -> Import screenshots -> review -> Save -> Kelvin's page
  async m4(h) {
    const { page } = h;
    await go(h, '#/', 'text=LEE JUN HAO');
    h.mark('ready');
    await h.tap(page.locator('.tabbar').getByRole('link', { name: 'Customers' }));
    await page.locator('h1', { hasText: 'Customers' }).waitFor();
    await h.wait(800);
    await h.tap(page.locator('.main a:visible, .main button:visible', { hasText: 'Import screenshots' }).first());
    const choose = page.getByRole('button', { name: 'Choose screenshots' });
    await choose.waitFor();
    await h.wait(700);
    await h.files(choose, [join(DOCS, 'whatsapp/chat-new-lead-kelvin-1.png'), join(DOCS, 'whatsapp/chat-new-lead-kelvin-2.png')]);
    await h.wait(1200);
    await h.tap(page.getByRole('button', { name: 'Read with Copilot' }));
    await page.locator('.wa-reading-title').waitFor({ timeout: 15000 });
    h.mark('ai_start');
    await page.locator('h2', { hasText: 'Who is this?' }).waitFor({ timeout: 180000 });
    await h.wait(300);
    h.mark('ai_end');
    await h.wait(1200);
    for (const title of ['Conversation', 'Who is this?', 'Facts found', 'Suggested follow-ups']) {
      const sec = page.locator('h2', { hasText: title }).first();
      if (!(await sec.count())) continue;
      await h.reveal(sec, 'start');
      await h.wait(title === 'Conversation' ? 300 : 900);
      if (title === 'Conversation') { await h.scroll(500, 1500); await h.wait(500); }
    }
    await h.wait(800);
    const save = page.locator('.wa-save .btn-primary');
    h.mark('pre_save');
    await h.tap(save, 600);
    await page.waitForURL(/#\/customers\/[^/]+/, { timeout: 60000 });
    await page.locator('h1', { hasText: 'Kelvin' }).waitFor({ timeout: 30000 });
    h.mark('saved');
    await h.wait(1500);
    await h.scroll(380, 1400);
    await h.wait(1000);
  },

  // More -> New booking -> Take photo -> form -> deal with masked NRIC
  async m5(h) {
    const { page } = h;
    await go(h, '#/', 'text=LEE JUN HAO');
    h.mark('ready');
    await h.tap(page.locator('.tabbar').getByRole('button', { name: 'More' }));
    await h.wait(700);
    await h.tap(page.locator('.more-item', { hasText: 'New booking' }));
    await page.locator('h1', { hasText: 'New booking' }).waitFor();
    await h.wait(800);
    h.mark('photo');
    await h.files(page.getByRole('button', { name: 'Take photo' }).first(), join(DOCS, '01b-nric-tan-wei-ming-photo.jpg'));
    await h.wait(1200);
    h.mark('form_start');
    await h.tap(page.locator('.combo-trigger'));
    const search = page.locator('.combo-sheet input');
    await search.waitFor();
    await search.pressSequentially('Aurelia', { delay: 55 });
    await h.wait(500);
    await h.tap(page.locator('.combo-sheet .combo-opt', { hasText: 'Aurelia Bay Residences' }).first());
    await h.wait(700);
    await h.type(page.getByPlaceholder('#12-05'), '#12-05');
    await h.type(page.locator('label.field', { hasText: 'Purchase price' }).locator('input'), '1850000');
    const otp = page.locator('label.field', { hasText: 'OTP date' }).locator('input');
    await otp.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await h.wait(500);
    await otp.fill('2026-10-05');
    await h.wait(400);
    await h.tap(page.getByRole('radio', { name: 'Singapore Citizen' }));
    await h.tap(page.getByRole('radio', { name: 'Investment' }));
    const owned = page.locator('label.field', { hasText: 'Properties already owned' }).locator('input');
    await h.tap(owned);
    await owned.fill('');
    await owned.pressSequentially('1', { delay: 60 });
    await page.keyboard.press('Tab').catch(() => {});
    await h.wait(500);
    h.mark('form_end');
    await h.tap(page.getByRole('button', { name: 'Create booking' }));
    await page.locator('text=Registering the booking').waitFor({ timeout: 15000 });
    h.mark('ai_start');
    await page.waitForURL(/#\/deals\//, { timeout: 120000 });
    await page.locator('h2', { hasText: 'Closing timeline' }).waitFor({ timeout: 60000 });
    await h.wait(300);
    h.mark('ai_end');
    await h.wait(1600);
    const buyer = page.locator('.card', { has: page.locator('h2', { hasText: 'Buyer' }) }).first();
    await h.reveal(buyer, 'center');
    h.mark('buyer');
    await h.wait(2600);
  },
};

for (const name of process.argv.slice(2)) {
  console.log('recording', name);
  await scene(name, SCENES[name]);
}

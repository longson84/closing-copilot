// Records each demo scene as its own Playwright video + a marks JSON.
// Usage: node scripts/record.mjs s1 s2 s3 ...   (s7p = phone shot)
import { chromium } from 'playwright';
import { mkdirSync, renameSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const RAW = join(here, '..', 'build', 'raw');
const DOCS = join(ROOT, 'demo-docs');
const BASE = 'https://closing-copilot-898383619830.asia-southeast1.run.app/';
const STATE = join(RAW, 'state.json');
mkdirSync(RAW, { recursive: true });
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
const saveState = () => writeFileSync(STATE, JSON.stringify(state, null, 1));

// Visible fake cursor (headless video has no OS cursor).
const CURSOR = `
(() => {
  const mk = () => {
    if (document.getElementById('__cur')) return;
    const c = document.createElement('div');
    c.id = '__cur';
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.4-6.8L4 20z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: 'fixed', left: '-40px', top: '-40px', zIndex: 2147483647, pointerEvents: 'none', transform: 'translate(-3px,-2px)', transition: 'none' });
    const r = document.createElement('div');
    r.id = '__ring';
    Object.assign(r.style, { position: 'fixed', width: '34px', height: '34px', marginLeft: '-17px', marginTop: '-17px', borderRadius: '50%', border: '3px solid rgba(15,110,95,.75)', zIndex: 2147483646, pointerEvents: 'none', opacity: 0, transition: 'opacity .35s, transform .35s', transform: 'scale(.4)' });
    document.documentElement.append(c, r);
    addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', (e) => {
      r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
      r.style.transition = 'none'; r.style.opacity = 1; r.style.transform = 'scale(.4)';
      requestAnimationFrame(() => { r.style.transition = 'opacity .45s, transform .45s'; r.style.opacity = 0; r.style.transform = 'scale(1.3)'; });
    }, true);
    if (window.__curPos) { c.style.left = window.__curPos[0] + 'px'; c.style.top = window.__curPos[1] + 'px'; }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mk); else mk();
})();`;

async function scene(name, fn, opts = {}) {
  const browser = await chromium.launch();
  const vp = opts.viewport ?? { width: 1440, height: 900 };
  const vsize = opts.videoSize ?? vp;
  const ctx = await browser.newContext({
    viewport: vp,
    deviceScaleFactor: opts.dsf ?? 1,
    isMobile: opts.isMobile ?? false,
    hasTouch: opts.hasTouch ?? false,
    userAgent: opts.userAgent,
    recordVideo: { dir: RAW, size: vsize },
    reducedMotion: 'no-preference',
  });
  if (!opts.noCursor) await ctx.addInitScript(CURSOR);
  const page = await ctx.newPage();
  const t0 = Date.now();
  const marks = {};
  const mark = (k) => { marks[k] = (Date.now() - t0) / 1000; console.log(`  [${name}] ${k} @ ${marks[k].toFixed(2)}s`); };
  let pos = [vp.width * 0.6, vp.height * 0.55];
  const h = {
    page,
    mark,
    wait: (ms) => page.waitForTimeout(ms),
    async move(x, y, steps = 28) {
      await page.mouse.move(x, y, { steps });
      pos = [x, y];
      await page.evaluate((p) => (window.__curPos = p), pos);
    },
    async moveTo(loc, { dx = 0.5, dy = 0.5, steps = 28 } = {}) {
      await loc.waitFor({ state: 'visible' });
      const b = await loc.boundingBox();
      await h.move(b.x + b.width * dx, b.y + b.height * dy, steps);
    },
    async reveal(loc, block = 'center') {
      await loc.waitFor({ state: 'attached' });
      await loc.evaluate((el, block) => {
        // Scroll only the nearest scrollable ancestor (never the document behind the app shell).
        let p = el.parentElement;
        while (p && !(/(auto|scroll)/.test(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight)) p = p.parentElement;
        p = p || document.scrollingElement;
        const pr = p === document.scrollingElement ? { top: 0, height: innerHeight } : p.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        const off = block === 'start' ? r.top - pr.top - 24 : r.top - pr.top - (pr.height - r.height) / 2;
        p.scrollTo({ top: p.scrollTop + off, behavior: 'smooth' });
      }, block);
      await page.waitForTimeout(1000);
    },
    async click(loc, opts = {}) {
      await loc.waitFor({ state: 'visible' });
      const b = await loc.boundingBox();
      if (b.y < 10 || b.y + b.height > vp.height - 10) await h.reveal(loc);
      await h.moveTo(loc, opts);
      await page.waitForTimeout(opts.pause ?? 220);
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(250);
    },
    async type(loc, text) {
      await h.click(loc);
      await loc.pressSequentially(text, { delay: 45 });
    },
    async upload(loc, files) {
      const fc = page.waitForEvent('filechooser');
      await h.click(loc);
      const chooser = await fc;
      await chooser.setFiles(files);
    },
    async wheel(dy, over, stepPx = 60, gap = 28) {
      if (over) await h.moveTo(over, { steps: 12 });
      const n = Math.max(1, Math.round(Math.abs(dy) / stepPx));
      for (let i = 0; i < n; i++) {
        await page.mouse.wheel(0, Math.sign(dy) * stepPx);
        await page.waitForTimeout(gap);
      }
      await page.waitForTimeout(300);
    },
  };
  try {
    await fn(h);
  } catch (e) {
    await page.screenshot({ path: join(RAW, `${name}-error.png`) });
    throw e;
  } finally {
    mark('end');
    const video = page.video();
    await ctx.close();
    await browser.close();
    renameSync(await video.path(), join(RAW, `${name}.webm`));
    writeFileSync(join(RAW, `${name}.json`), JSON.stringify(marks, null, 1));
  }
}

const go = async (h, hash, readySel) => {
  await h.page.goto(BASE + hash);
  await h.page.locator(readySel + ' >> visible=true').first().waitFor({ state: 'visible', timeout: 30000 });
  await h.page.evaluate(() => document.fonts.ready);
  await h.wait(900);
};

const SCENES = {
  // S1 · Pipeline: emphasise Lee Jun Hao overdue
  async s1(h) {
    const { page } = h;
    await go(h, '#/', 'text=LEE JUN HAO');
    h.mark('ready');
    await h.wait(1200);
    await h.moveTo(page.locator('.main').getByText('Overdue', { exact: true }).first(), { steps: 40 });
    await h.wait(1600);
    const lee = page.locator('tr', { hasText: 'LEE JUN HAO' }).first();
    await h.moveTo(lee.getByText('LEE JUN HAO'), { steps: 40 });
    await h.wait(1300);
    await h.moveTo(lee.getByText('2d overdue'), { steps: 30 });
    await h.wait(1300);
    await h.moveTo(lee.locator('text=Overdue').last(), { steps: 25 });
    await h.wait(2200);
    const priya = page.locator('tr', { hasText: 'PRIYA' }).first();
    await h.moveTo(priya.getByText('5 days'), { steps: 35 });
    await h.wait(1500);
    const chen = page.locator('tr', { hasText: 'CHEN XIAOLING' }).first();
    await h.moveTo(chen.locator('td').last(), { steps: 35 });
    await h.wait(1500);
    await h.wheel(240, page.locator('.main h1'), 30, 40);
    await h.wait(1500);
    await h.wheel(-240, null, 30, 40);
    await h.wait(1500);
  },

  // S2 · New booking from an ID photo
  async s2(h) {
    const { page } = h;
    await go(h, '#/', 'text=LEE JUN HAO');
    h.mark('ready');
    await h.wait(500);
    await h.click(page.locator('.main').getByRole('link', { name: 'New booking' }).first());
    await page.locator('h1', { hasText: 'New booking' }).waitFor();
    await h.wait(900);
    const drop = page.locator('.dropzone').first();
    h.mark('upload');
    await h.upload(drop, join(DOCS, '01b-nric-tan-wei-ming-photo.jpg'));
    await h.wait(1300);
    h.mark('form_start');
    const combo = page.getByRole('combobox');
    await h.type(combo, 'Aurelia');
    await h.wait(700);
    await h.click(page.locator('.combo-opt', { hasText: 'Aurelia Bay Residences' }).first());
    await h.wait(900);
    await h.type(page.getByPlaceholder('#12-05'), '#12-05');
    await h.type(page.locator('label.field', { hasText: 'Purchase price' }).locator('input'), '1850000');
    const otp = page.locator('label.field', { hasText: 'OTP date' }).locator('input');
    await h.click(otp, { dx: 0.3 });
    await otp.fill('2026-10-05');
    await h.wait(400);
    await h.reveal(page.locator('.segmented').first());
    await h.click(page.getByRole('radio', { name: 'Singapore Citizen' }));
    await h.click(page.getByRole('radio', { name: 'Investment' }));
    const owned = page.locator('label.field', { hasText: 'Properties already owned' }).locator('input');
    await h.click(owned);
    await page.keyboard.press('ControlOrMeta+a');
    await owned.pressSequentially('1', { delay: 60 });
    await h.wait(400);
    h.mark('form_end');
    const submit = page.getByRole('button', { name: 'Create booking' });
    await h.reveal(submit);
    await h.click(submit);
    await page.locator('text=Registering the booking').waitFor({ timeout: 15000 });
    h.mark('ai_start');
    await page.waitForURL(/#\/deals\//, { timeout: 120000 });
    await page.locator('.review-banner').waitFor({ timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await h.wait(400);
    h.mark('ai_end');
    state.dealHash = new URL(page.url()).hash.replace(/\?.*$/, '');
    saveState();
    await h.wait(1500);
    await h.moveTo(page.locator('.review-banner strong'), { steps: 30 });
    await h.wait(1800);
    const buyer = page.locator('.card', { has: page.locator('h2', { hasText: 'Buyer' }) }).first();
    await h.reveal(buyer);
    await h.moveTo(buyer.locator('h2'), { steps: 30 });
    await h.wait(1200);
    await h.wheel(200, null, 40, 40);
    await h.wait(2500);
  },

  // S3 · S&P mismatch caught
  async s3(h) {
    const { page } = h;
    if (!state.dealHash) throw new Error('No deal from s2');
    await go(h, state.dealHash, 'h2:has-text("Documents")');
    h.mark('ready');
    await h.wait(800);
    const drop = page.locator('.upload-area .dropzone');
    await h.reveal(drop);
    await h.upload(drop, join(DOCS, '03-spa-aurelia-bay-12-05.pdf'));
    await page.locator('.upload-area .uploading').waitFor({ timeout: 15000 });
    h.mark('ai_start');
    await page.locator('.hero-alert').waitFor({ timeout: 120000 });
    await page.locator('.upload-area .uploading').waitFor({ state: 'detached', timeout: 60000 });
    h.mark('ai_end');
    await h.wait(900);
    // show the fresh document card with its mismatch lines first
    const newDoc = page.locator('.doc-list > *').first();
    await h.moveTo(newDoc, { dy: 0.2, steps: 30 });
    await h.wait(1800);
    // then the hero alert at the top
    const alert = page.locator('.hero-alert');
    await h.reveal(alert, 'start');
    await h.moveTo(alert.locator('h2'), { steps: 30 });
    await h.wait(1200);
    const lines = alert.locator('.hero-alert-body p');
    const n = await lines.count();
    for (let i = 0; i < n; i++) {
      await h.moveTo(lines.nth(i), { dx: 0.7, steps: 25 });
      await h.wait(1300);
    }
    h.mark('hold_end');
    await h.wait(1500);
    // corrected S&P
    await h.reveal(drop);
    await h.upload(drop, join(DOCS, '03b-spa-aurelia-bay-12-05-corrected.pdf'));
    await page.locator('.upload-area .uploading').waitFor({ timeout: 15000 });
    h.mark('ai2_start');
    await page.locator('.upload-area .uploading').waitFor({ state: 'detached', timeout: 120000 });
    h.mark('ai2_end');
    await h.wait(800);
    const fresh = page.locator('.doc-list > *').first();
    await h.reveal(fresh, 'center');
    await h.moveTo(fresh, { dy: 0.2, steps: 30 });
    await h.wait(1800);
    const replaced = page.locator('.doc-list > *', { hasText: 'Replaced' }).first();
    if (await replaced.count()) {
      await h.reveal(replaced, 'center');
      await h.moveTo(replaced, { dy: 0.3, steps: 30 });
      await h.wait(1500);
    }
    // back to the top: the red alert is gone
    await page.locator('.main').evaluate((el) => { el.scrollTo({ top: 0, behavior: 'smooth' }); document.scrollingElement.scrollTo({ top: 0, behavior: 'smooth' }); });
    await h.wait(1200);
    await h.moveTo(page.locator('.main h1').first(), { steps: 30 });
    h.mark('clean');
    await h.wait(2500);
  },

  // S4 · WhatsApp screenshots -> new customer -> AI project matches
  async s4(h) {
    const { page } = h;
    await go(h, '#/customers', 'text=Import screenshots');
    h.mark('ready');
    await h.wait(900);
    await h.click(page.locator('.main').getByText('Import screenshots').first());
    const drop = page.locator('.wa-drop');
    await drop.waitFor();
    await h.wait(900);
    await h.upload(drop, [join(DOCS, 'whatsapp/chat-new-lead-kelvin-1.png'), join(DOCS, 'whatsapp/chat-new-lead-kelvin-2.png')]);
    await h.wait(1600);
    await h.click(page.getByRole('button', { name: 'Read with Copilot' }));
    await page.locator('.wa-reading-title').waitFor({ timeout: 15000 });
    h.mark('ai_start');
    await page.locator('h2', { hasText: 'Who is this?' }).waitFor({ timeout: 180000 });
    await h.wait(500);
    h.mark('ai_end');
    await h.wait(1800);
    await h.moveTo(page.locator('h2', { hasText: 'Who is this?' }), { steps: 30 });
    await h.wait(1500);
    for (const title of ['Summary', 'Facts found', 'About the customer', 'Suggested follow-ups']) {
      const sec = page.locator('h2', { hasText: title }).first();
      if (!(await sec.count())) continue;
      await h.reveal(sec, 'start');
      await h.moveTo(sec, { steps: 25 });
      await h.wait(title === 'Suggested follow-ups' ? 2600 : 1500);
    }
    const save = page.locator('.wa-save .btn-primary');
    h.mark('pre_save');
    await h.reveal(save);
    await h.moveTo(save, { steps: 30 });
    await h.wait(900);
    await h.click(save);
    await page.waitForURL(/#\/customers\/[^/]+/, { timeout: 60000 });
    await page.locator('h2', { hasText: 'Matched projects' }).waitFor({ timeout: 30000 });
    h.mark('saved');
    await h.wait(1800);
    const matches = page.locator('.card', { has: page.locator('h2', { hasText: 'Matched projects' }) });
    await h.reveal(matches, 'start');
    const sug = matches.getByRole('button', { name: 'Suggest with AI' });
    await h.click(sug);
    h.mark('ai2_start');
    await page.getByText('Matching the catalog').waitFor({ timeout: 15000 });
    await page.getByText('Matching the catalog').waitFor({ state: 'detached', timeout: 180000 });
    await page.waitForFunction(() => {
      const c = [...document.querySelectorAll('.card')].find((x) => x.querySelector('h2')?.textContent?.includes('Matched projects'));
      const b = c && [...c.querySelectorAll('button')].find((x) => x.textContent?.includes('Suggest with AI'));
      return b && !b.disabled;
    }, null, { timeout: 180000 });
    await h.wait(400);
    h.mark('ai2_end');
    await h.wait(800);
    await h.reveal(matches, 'start');
    await h.moveTo(matches.locator('h2'), { steps: 25 });
    await h.wait(1500);
    await h.wheel(300, null, 30, 50);
    await h.wait(3000);
  },

  // S5 · Goh: family & after-sales, then Joanne's birthday wishes
  async s5(h) {
    const { page } = h;
    await go(h, '#/customers', 'text=Import screenshots');
    h.mark('ready');
    await h.wait(700);
    await h.click(page.locator('.main tr', { hasText: 'GOH BOON' }).first().getByText(/GOH BOON/).first(), { dx: 0.3 });
    await page.locator('h1', { hasText: 'GOH BOON KIAT' }).waitFor();
    await h.wait(1000);
    h.mark('family');
    await h.click(page.locator('.desktop-tabs').getByRole('tab', { name: /Family & dates/ }));
    await h.wait(2600);
    await h.wheel(420, page.locator('.main h1'), 40, 45);
    await h.wait(1800);
    await h.wheel(-420, null, 60, 30);
    h.mark('aftersales');
    await h.click(page.locator('.desktop-tabs').getByRole('tab', { name: /After-sales/ }));
    await h.wait(2800);
    await h.wheel(300, null, 40, 45);
    await h.wait(1200);
    h.mark('reminders');
    await h.click(page.locator('.sidebar').getByRole('link', { name: 'Reminders' }));
    await page.locator('h1', { hasText: 'Reminders' }).waitFor();
    await h.wait(900);
    const row = page.locator('.rem-list li', { hasText: 'Joanne' }).filter({ has: page.getByRole('button', { name: 'Send wishes' }) }).first();
    await h.reveal(row);
    await h.moveTo(row.locator('.rem-title'), { steps: 30 });
    await h.wait(1200);
    await h.click(row.getByRole('button', { name: 'Send wishes' }));
    h.mark('ai_start');
    await page.waitForFunction(() => {
      const m = [...document.querySelectorAll('.copilot .msg-ai')].pop();
      return m && m.querySelector('.md, p, li');
    }, null, { timeout: 120000 });
    h.mark('ai_text');
    await page.waitForFunction(() => !document.querySelector('.copilot-foot .chip')?.disabled, null, { timeout: 180000 });
    h.mark('ai_end');
    await h.moveTo(page.locator('.copilot .msg-ai').last(), { dy: 0.3, steps: 30 });
    await h.wait(3500);
  },

  // S6 · Ask Copilot
  async s6(h) {
    const { page } = h;
    await go(h, '#/', 'text=LEE JUN HAO');
    h.mark('ready');
    await h.wait(700);
    const ta = page.locator('.copilot textarea');
    await h.type(ta, 'What do I need to do today?');
    await h.wait(500);
    await page.keyboard.press('Enter');
    h.mark('ai_start');
    await page.locator('.copilot .tool-chip').first().waitFor({ timeout: 60000 }).catch(() => {});
    h.mark('ai_tool');
    await page.waitForFunction(() => {
      const m = [...document.querySelectorAll('.copilot .msg-ai')].pop();
      return m && m.querySelector('p, li');
    }, null, { timeout: 120000 });
    h.mark('ai_text');
    await page.waitForFunction(() => !document.querySelector('.copilot-foot .chip')?.disabled, null, { timeout: 180000 });
    h.mark('ai_end');
    await h.wait(600);
    // scroll the answer from the top
    await page.locator('.copilot-body').evaluate((el) => el.scrollTo({ top: 0, behavior: 'smooth' }));
    await h.wait(1200);
    await h.moveTo(page.locator('.copilot .msg-ai').last(), { dy: 0.1, steps: 30 });
    await h.wait(1500);
    const sh = await page.locator('.copilot-body').evaluate((el) => el.scrollHeight - el.clientHeight);
    await h.wheel(sh + 60, null, 25, 70);
    await h.wait(2500);
  },

  // S7 phone shot
  async s7p(h) {
    const { page } = h;
    await go(h, '#/', 'text=LEE JUN HAO');
    h.mark('ready');
    await h.wait(1200);
    const row = page.locator('.main >> text=LEE JUN HAO >> visible=true').first();
    await row.tap();
    await page.locator('h2', { hasText: 'Closing timeline' }).waitFor({ timeout: 30000 });
    await h.wait(1200);
    await page.mouse.wheel(0, 0);
    await page.evaluate(() => (document.querySelector('.main') ?? document.scrollingElement).scrollBy({ top: 320, behavior: 'smooth' }));
    await h.wait(2500);
  },
};

const PHONE = {
  viewport: { width: 390, height: 844 },
  dsf: 3,
  noCursor: true,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
};

for (const name of process.argv.slice(2)) {
  console.log('recording', name);
  await scene(name, SCENES[name], name === 's7p' ? PHONE : {});
}

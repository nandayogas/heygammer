// tests/e2e.cjs — uji otomatis HEYGAMMER (Tahap 8): tombol, navigasi, gameplay sampai selesai, dan tampilan Android.
//
// Cara pakai (Node 18+, Playwright terpasang):
//   npm i -D playwright && npx playwright install chromium
//   node tests/e2e.cjs http://localhost:8000/index.html
//
// Opsional: STUBS=1 memblokir CDN (three.js & Firebase) dan memakai modul palsu.
// Itu hanya untuk lingkungan tanpa akses CDN; jangan dipakai untuk pengujian visual sungguhan.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://localhost:8000/index.html';
const SHOTS = process.env.SHOTS || path.join(__dirname, 'screenshots');
const USE_STUBS = process.env.STUBS === '1';
fs.mkdirSync(SHOTS, { recursive: true });

// Stub hanya untuk sandbox tanpa CDN: STUB_DIR menunjuk ke folder berisi stub-three.mjs.
const STUB_THREE = USE_STUBS ? fs.readFileSync(path.join(process.env.STUB_DIR || __dirname, 'stub-three.mjs'), 'utf8') : '';
const STUB_ADDON = 'export class FontLoader { load(u, ok, p, err) { err && err(new Error("stub")); } parse() { return {}; } }\nexport class TextGeometry {}';
const STUB_FIREBASE = 'export const initializeApp=()=>({});export const getFirestore=()=>({});export const collection=()=>({});export const addDoc=async()=>({});export const query=()=>({});export const orderBy=()=>({});export const limit=()=>({});export const getDocs=async()=>({docs:[]});export const serverTimestamp=()=>0;';
const js = body => ({ status: 200, contentType: 'application/javascript', body });

const results = [];
const check = (name, pass, extra = '') => { results.push({ name, pass: !!pass, extra }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };

async function newPage(browser, opts) {
  const ctx = await browser.newContext(opts);
  if (USE_STUBS) {
    await ctx.route(/three\.module\.js/, r => r.fulfill(js(STUB_THREE)));
    await ctx.route(/examples\/jsm/, r => r.fulfill(js(STUB_ADDON)));
    await ctx.route(/gstatic\.com\/firebasejs/, r => r.fulfill(js(STUB_FIREBASE)));
    await ctx.route(/examples\/fonts/, r => r.fulfill({ status: 404, body: '' }));
  }
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.errors.push(m.text()); });
  return { ctx, page };
}

const isInGame = p => p.evaluate(() => document.body.classList.contains('in-game'));
const resultShown = p => p.evaluate(() => document.getElementById('result').classList.contains('show'));

/* Input yang dibutuhkan tiap game agar sampai selesai. Game lain cukup diberi tombol arah acak. */
const ACTIONS = {
  memory: async p => {
    const faces = await p.$$eval('#gameBox .card3d .front', els => els.map(e => e.textContent));
    const cards = p.locator('#gameBox .card3d');
    const idx = {};
    faces.forEach((f, i) => (idx[f] = idx[f] || []).push(i));
    for (const k of Object.keys(idx)) {
      for (const i of idx[k]) await cards.nth(i).click({ timeout: 3000 }).catch(() => {});
      await p.waitForTimeout(150);
    }
  },
  rps: async p => { await p.locator('#gameBox [data-c]').nth(Math.floor(Math.random() * 3)).click({ force: true }).catch(() => {}); await p.waitForTimeout(250); },
  penalty: async p => {
    await p.locator('#gameBox [data-aim]').nth(Math.floor(Math.random() * 3)).click({ force: true }).catch(() => {});
    await p.locator('#kick').click({ force: true }).catch(() => {});
    await p.waitForTimeout(700);
  },
  basket: async p => { await p.locator('#shoot').click({ force: true }).catch(() => {}); await p.waitForTimeout(900); },
  fruit: async p => {
    // Solver sederhana: cari tukaran bersebelahan yang membentuk deret tiga, lalu klik.
    const N = 6;
    const txt = await p.$$eval('#gameBox .fgrid button', bs => bs.map(b => b.textContent));
    if (txt.length !== N * N) return p.waitForTimeout(200);
    const g = Array.from({ length: N }, (_, r) => txt.slice(r * N, r * N + N));
    const has = h => { for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const v = h[r][c];
      if (c + 2 < N && v === h[r][c + 1] && v === h[r][c + 2]) return true;
      if (r + 2 < N && v === h[r + 1][c] && v === h[r + 2][c]) return true; } return false; };
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const r2 = r + dr, c2 = c + dc; if (r2 >= N || c2 >= N) continue;
      const h = g.map(x => x.slice()); [h[r][c], h[r2][c2]] = [h[r2][c2], h[r][c]];
      if (has(h)) {
        await p.locator(`#gameBox .fgrid button[data-r="${r}"][data-c="${c}"]`).click({ force: true });
        await p.locator(`#gameBox .fgrid button[data-r="${r2}"][data-c="${c2}"]`).click({ force: true });
        return p.waitForTimeout(1100); // beri waktu animasi kaskade selesai (input diabaikan saat busy)
      }
    }
    await p.waitForTimeout(300);
  },
  ttt: async p => {
    const cells = p.locator('#gameBox .grid button');
    const n = await cells.count();
    if (!n) return p.waitForTimeout(200);
    await cells.nth(Math.floor(Math.random() * n)).click({ force: true }).catch(() => {});
    await p.waitForTimeout(450);
  },
  zombie: async p => { await p.waitForTimeout(800); },
};
const LIMIT = { memory: 30000, rps: 60000, penalty: 90000, basket: 90000, fruit: 90000, zombie: 150000, default: 60000 };

async function randomInput(p) {
  await p.keyboard.press(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'][Math.floor(Math.random() * 4)]);
  const b = p.locator('#gameBox [data-k]');
  const n = await b.count();
  if (n) await b.nth(Math.floor(Math.random() * n)).click({ force: true }).catch(() => {});
  await p.waitForTimeout(500);
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

  /* ===== A. Desktop: tombol & navigasi ===== */
  {
    const { ctx, page } = await newPage(browser, { viewport: { width: 1366, height: 800 } });
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    check('A1 halaman dimuat tanpa error', page.errors.length === 0, page.errors.slice(0, 2).join(' | '));
    check('A2 intro tampil di kunjungan pertama', await page.isVisible('#intro'));
    await page.click('#skipIntro'); await page.waitForTimeout(1000);
    check('A3 SKIP INTRO menyembunyikan intro', !(await page.isVisible('#intro')));
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(600);
    check('A4 intro tampil lagi setelah reload', await page.isVisible('#intro'));

    await page.click('#gear'); await page.click('#replay'); await page.waitForTimeout(400);
    check('A5 REPLAY INTRO memutar intro lagi', await page.isVisible('#intro'));
    await page.click('#skipIntro'); await page.waitForTimeout(1000);

    const slide = () => page.evaluate(() => document.querySelector('.slide.on h1').textContent);
    const s0 = await slide();
    await page.click('[data-next]'); const s1 = await slide();
    await page.click('[data-prev]'); const s2 = await slide();
    await page.click('[data-dot="2"]'); const s3 = await slide();
    check('A6 carousel hero: next, prev, dot berfungsi', s0 !== s1 && s2 === s0 && s3 === 'LEADERBOARD', `${s0} → ${s1} → ${s2} → ${s3}`);

    await page.click('[data-hplay]'); await page.waitForTimeout(300);
    check('A7 PLAY NOW hero membuka game', await isInGame(page));
    await page.click('#gm [data-close="gm"]'); await page.waitForTimeout(200);

    const count = () => page.evaluate(() => document.querySelectorAll('#gameList .gcard').length);
    check('A8 katalog menampilkan 13 game', (await count()) === 13, `count=${await count()}`);
    await page.click('#pills [data-f="new"]'); const nNew = await count();
    await page.click('#pills [data-f="top"]'); const nTop = await count();
    await page.click('#pills [data-f="all"]');
    check('A9 filter New & Top Rated berfungsi', nNew > 0 && nNew < 13 && nTop === 13, `new=${nNew} top=${nTop}`);

    await page.fill('#q', 'racing'); await page.keyboard.press('Enter');
    check('A10 search nama "racing" → 1 hasil', (await count()) === 1);
    await page.fill('#q', 'puzzle'); await page.keyboard.press('Enter');
    check('A11 search kategori "puzzle" → beberapa hasil', (await count()) >= 3, `count=${await count()}`);
    await page.fill('#q', 'zzzz'); await page.keyboard.press('Enter');
    check('A12 search tanpa hasil menampilkan pesan', (await page.textContent('#gameList')).includes('Tidak ada game'));
    await page.fill('#q', ''); await page.keyboard.press('Enter');

    await page.click('[data-cat="Racing"]');
    check('A13 kategori Racing memfilter', (await count()) >= 1 && (await page.textContent('#gHint')).includes('Racing'));
    await page.click('[data-cat="Racing"]');
    check('A14 kategori tanpa game diberi label "Segera hadir"', (await page.textContent('#catList')).includes('Segera hadir'));

    await page.click('[data-fav="memory"]');
    check('A15 tombol favorit menyimpan ke localStorage', await page.evaluate(() => JSON.parse(localStorage.getItem('hg_fav')).includes('memory')));
    await page.click('nav a[data-nav="fav"]');
    check('A16 nav Favorites memfilter favorit', (await count()) === 1);
    await page.click('#pills [data-f="all"]');
    await page.click('[data-fav="memory"]');

    for (const n of ['home', 'explore', 'cats', 'trending', 'new', 'popular', 'lb', 'daily']) {
      await page.click(`nav a[data-nav="${n}"]`); await page.waitForTimeout(120);
    }
    check('A17 semua menu sidebar berfungsi tanpa error', page.errors.length === 0, page.errors.slice(0, 2).join(' | '));
    await page.click('nav a[data-nav="about"]');
    check('A18 menu About membuka modal', await page.isVisible('#about'));
    await page.click('#about [data-close="about"]');

    await page.click('#bell'); await page.waitForTimeout(100);
    check('A19 notifikasi menampilkan toast', (await page.locator('.toast').count()) >= 1);

    check('A20 leaderboard menampilkan data', (await page.locator('#lbList li').count()) >= 3);

    const dText = await page.textContent('#dailyText');
    check('A21 daily challenge menampilkan game hari ini', dText.includes('Hari ini'), dText);
    await page.click('#joinDaily'); await page.waitForTimeout(400);
    check('A22 Join Challenge membuka game', await isInGame(page));
    await page.click('#gm [data-close="gm"]'); await page.waitForTimeout(200);

    // Recently Played: muncul setelah satu game dimainkan
    await page.click('[data-play="racing"]', { force: true }); await page.waitForTimeout(300);
    await page.click('#gm [data-close="gm"]'); await page.waitForTimeout(200);
    check('A23 Recently Played menampilkan game terakhir', await page.isVisible('#recent') && (await page.textContent('#recentList')).includes('Racing Fever'));

    /* --- semua 13 game: buka, mulai, kontrol, pause, restart, kembali --- */
    const ids = await page.evaluate(() => [...document.querySelectorAll('#gameList [data-play]')].map(b => b.dataset.play));
    for (const id of ids) {
      const before = page.errors.length;
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.click(`#gameList [data-play="${id}"]`, { force: true });
      await page.waitForTimeout(350);
      const opened = await isInGame(page);
      if (await page.locator('#gameBox .splash button').count()) { await page.click('#gameBox .splash button'); await page.waitForTimeout(250); }
      for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) await page.keyboard.press(k);
      await page.waitForTimeout(600);
      await page.click('#pauseBtn');
      const paused = await page.evaluate(() => document.getElementById('pause').classList.contains('show'));
      await page.click('#resume');
      await page.click('#restart'); await page.waitForTimeout(300);
      await page.click('#gm [data-close="gm"]'); await page.waitForTimeout(150);
      const closed = !(await isInGame(page));
      const newErr = page.errors.length - before;
      check(`G1 ${id}: buka, mulai, kontrol, pause, restart, kembali`, opened && paused && closed && newErr === 0,
        newErr ? page.errors.slice(before).slice(0, 2).join(' | ') : '');
    }

    /* --- setiap game sampai selesai: layar hasil, skor, Main Lagi, kembali --- */
    for (const id of ids) {
      const before = page.errors.length;
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.click(`#gameList [data-play="${id}"]`, { force: true }); await page.waitForTimeout(300);
      if (await page.locator('#gameBox .splash button').count()) await page.click('#gameBox .splash button');
      const act = ACTIONS[id] || randomInput;
      const t0 = Date.now(); let finished = false;
      while (Date.now() - t0 < (LIMIT[id] || LIMIT.default)) {
        if (await resultShown(page)) { finished = true; break; }
        await act(page);
      }
      let againOk = false, backOk = false, score = null;
      if (finished) {
        score = await page.textContent('#resScore');
        await page.click('#again'); await page.waitForTimeout(350);
        againOk = !(await resultShown(page));
        await page.click('#gm [data-close="gm"]'); await page.waitForTimeout(200);
        backOk = !(await isInGame(page));
      } else {
        await page.click('#gm [data-close="gm"]').catch(() => {}); await page.waitForTimeout(200);
      }
      check(`G2 ${id}: selesai, skor tampil, Main Lagi & kembali`, finished && againOk && backOk && page.errors.length === before,
        `skor=${score} ${Math.round((Date.now() - t0) / 1000)}s${finished ? '' : ' (tidak selesai dalam batas waktu)'}`);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(SHOTS, 'desktop-dashboard.png') });
    await ctx.close();
  }

  /* ===== B. Android: portrait & landscape ===== */
  for (const [label, vp] of [['android-portrait', { width: 390, height: 844 }], ['android-landscape', { width: 844, height: 390 }]]) {
    const { ctx, page } = await newPage(browser, { viewport: vp, isMobile: true, hasTouch: true });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.evaluate(() => localStorage.setItem('hg_introSeen', 'true'));
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(700);
    const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    check(`B1 ${label}: dashboard tanpa horizontal overflow`, o.sw <= o.iw + 1, `scrollWidth=${o.sw} vw=${o.iw}`);
    if (label === 'android-portrait') {
      const cols = await page.evaluate(() => getComputedStyle(document.querySelector('#gameList')).gridTemplateColumns.split(' ').length);
      check('B2 portrait: grid game 2 kartu per baris', cols === 2, `cols=${cols}`);
    }
    if (label === 'android-portrait') {
      const scrollable = await page.evaluate(() => { const a = document.querySelector('aside'); return a.scrollWidth > a.clientWidth; });
      check('B6 portrait: menu bawah bisa digeser (10 menu)', scrollable);
      await page.click('nav a[data-nav="about"]');
      check('B7 portrait: menu About terakhir tetap bisa dibuka', await page.isVisible('#about'));
      await page.click('#about [data-close="about"]');
    }
    await page.locator('#gameList').scrollIntoViewIfNeeded();
    await page.click('[data-play="memory"]', { force: true }); await page.waitForTimeout(400);
    await page.click('#gameBox .splash button').catch(() => {}); await page.waitForTimeout(300);
    const gm = await page.evaluate(() => {
      const vw = innerWidth;
      const r = document.getElementById('gm').getBoundingClientRect();
      const bad = [];
      document.querySelectorAll('#gm button').forEach(b => {
        const q = b.getBoundingClientRect();
        if (!q.width) return;
        if (q.right > vw + 1 || q.left < -1) bad.push('keluar:' + b.textContent.trim().slice(0, 12));
        if (q.height < 40) bad.push(`kecil(${Math.round(q.height)}px):` + b.textContent.trim().slice(0, 10));
      });
      const cards = [...document.querySelectorAll('#gameBox .card3d')].map(c => c.getBoundingClientRect());
      const minCard = cards.length ? Math.min(...cards.map(c => c.width)) : 0;
      const cardsVisible = cards.every(c => c.bottom <= innerHeight + 1 || c.top < innerHeight);
      return { w: r.width, vw, bad, minCard: Math.round(minCard), cardCount: cards.length, sw: document.documentElement.scrollWidth };
    });
    check(`B3 ${label}: Game Mode memenuhi lebar layar`, Math.abs(gm.w - gm.vw) < 2 && gm.sw <= gm.vw + 1, `lebar=${gm.w} vw=${gm.vw}`);
    check(`B4 ${label}: tombol tidak terpotong & cukup besar`, gm.bad.length === 0, gm.bad.join(', '));
    check(`B5 ${label}: kartu Memory 4×4 cukup besar`, gm.cardCount === 16 && gm.minCard >= 60, `kartu=${gm.cardCount} lebar_min=${gm.minCard}px`);
    await page.screenshot({ path: path.join(SHOTS, `${label}-memory.png`) });
    await page.click('#gm [data-close="gm"]').catch(() => {});
    await ctx.close();
  }

  /* ===== C. Intro dengan reduced motion ===== */
  {
    const { ctx, page } = await newPage(browser, { viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(3500);
    const shown = await page.evaluate(() => getComputedStyle(document.getElementById('intro')).display);
    check('C1 reduced motion: intro selesai otomatis', shown === 'none', `display=${shown}`);
    check('C2 reduced motion: tanpa error', page.errors.length === 0, page.errors.slice(0, 2).join(' | '));
    await ctx.close();
  }

  await browser.close();
  const failed = results.filter(r => !r.pass);
  console.log(`\nTOTAL ${results.length}  LULUS ${results.length - failed.length}  GAGAL ${failed.length}`);
  process.exitCode = failed.length ? 1 : 0;
})().catch(e => { console.error('CRASH', e); process.exit(1); });

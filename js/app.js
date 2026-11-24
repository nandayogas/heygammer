// js/app.js
// Logika utama dashboard: navigasi, pencarian, filter, favorit, daily challenge,
// leaderboard (online/lokal), modal permainan, settings, dan kontrol intro.
import { runGame } from './games.js';
import { backend } from './firebase.js';
import { startHero, runIntro } from './three-scene.js';

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const R = n => Math.floor(Math.random() * n);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toDateString();

const store = {
  get(k, d) { try { const v = localStorage.getItem('hg_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('hg_' + k, JSON.stringify(v)); } catch { /* penyimpanan penuh/diblokir */ } },
};

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || store.get('reduce', false);
document.body.classList.toggle('reduce', reduce);

/* ---------- data ---------- */
const GAMES = [
  { id: 'memory', name: 'Memory Challenge', game: 'memory', emoji: '🧠', rating: 4.9, players: '2.1M', cats: ['Puzzle', 'Adventure'], bg: 'linear-gradient(135deg,#4c1d95,#1e3a8a)' },
  { id: 'racing', name: 'Racing Fever', game: 'reaction', emoji: '🏎️', rating: 4.8, players: '1.8M', cats: ['Racing', 'Action', 'Sports'], isNew: true, bg: 'linear-gradient(135deg,#7f1d1d,#1e1b4b)' },
  { id: 'ttt', name: 'Tic Tac Toe', game: 'ttt', emoji: '❌', rating: 4.7, players: '1.5M', cats: ['Strategy', 'Simulation'], bg: 'linear-gradient(135deg,#1e1b4b,#0e7490)' },
  { id: 'snake', name: 'Snake Master', game: 'snake', emoji: '🐍', rating: 4.8, players: '1.2M', cats: ['Arcade', 'Action'], bg: 'linear-gradient(135deg,#14532d,#4c1d95)' },
  { id: '2048', name: '2048 Challenge', game: '2048', emoji: '🔢', rating: 4.8, players: '1.9M', cats: ['Puzzle', 'Strategy'], bg: 'linear-gradient(135deg,#78350f,#4c1d95)' },
  { id: 'rps', name: 'Rock Paper Scissors', game: 'rps', emoji: '✊', rating: 4.7, players: '1.6M', cats: ['Sports', 'Arcade'], isNew: true, bg: 'linear-gradient(135deg,#312e81,#831843)' },
];
const CATS = [['Arcade', '🕹️'], ['Action', '💥'], ['Racing', '🏎️'], ['Adventure', '🧭'], ['Puzzle', '🧩'], ['Sports', '⚽'], ['Strategy', '♞'], ['Simulation', '✈️']];
const SLIDES = [
  { t: 'HEYGAMMER', s: 'PLAY. EXPLORE. DOMINATE.', d: 'Discover amazing games, challenge yourself, and become a legend!' },
  { t: 'DAILY CHALLENGE', s: 'NEW EVERY DAY', d: "Complete today's challenge and claim your rewards." },
  { t: 'LEADERBOARD', s: 'CLIMB THE RANKS', d: 'Earn points from every game and take the top spot.' },
];
const SAMPLE_BOTS = [
  { n: 'ProGamer88', p: 125430, a: '👑' },
  { n: 'SkyHunter', p: 112760, a: '⭐' },
  { n: 'GameMasterID', p: 98120, a: '🥉' },
];

/* ---------- state ---------- */
let view = { f: 'all', cat: null, q: '' };
let favs = store.get('fav', []);
let slide = 0, heroTimer = null;
let current = null, curDaily = false, cleanup = null, stopIntro = null;

const gameName = id => (GAMES.find(g => g.id === id) || {}).name || id;
const totalBest = () => Object.values(store.get('best', {})).reduce((a, b) => a + b, 0);
const playerName = () => {
  let n = store.get('name', '');
  if (!n) { n = 'Guest-' + (1000 + R(9000)); store.set('name', n); }
  return n;
};

/* ---------- hero ---------- */
function renderHero() {
  $('#hero').insertAdjacentHTML('afterbegin', SLIDES.map((s, i) => `
    <div class="slide ${i ? '' : 'on'}">
      <h1>${esc(s.t)}</h1>
      <p class="slogan">${esc(s.s)}</p>
      <p class="desc">${esc(s.d)}</p>
      <div class="btns">
        <button class="neon-btn" data-hplay>▶ PLAY NOW</button>
        <button class="ghost-btn" data-nav="explore">🎮 EXPLORE GAMES</button>
      </div>
    </div>`).join(''));
  $('#dots').innerHTML = SLIDES.map((_, i) => `<i data-dot="${i}"></i>`).join('');
  $$('.dots i')[0].classList.add('on');
}
function goSlide(i) {
  slide = (i + SLIDES.length) % SLIDES.length;
  $$('.slide').forEach((el, j) => el.classList.toggle('on', j === slide));
  $$('.dots i').forEach((el, j) => el.classList.toggle('on', j === slide));
}
function restartHeroTimer() {
  clearInterval(heroTimer);
  heroTimer = setInterval(() => goSlide(slide + 1), 6000);
}

/* ---------- kategori & game ---------- */
function renderCats() {
  $('#catList').innerHTML = CATS.map(([n, i]) =>
    `<button class="cat glass" data-cat="${esc(n)}"><span class="ic">${i}</span>${esc(n)}</button>`).join('');
}

function gameCard(g) {
  const fav = favs.includes(g.id);
  return `<article class="gcard glass">
    <span class="thumb" style="background:${g.bg}">${g.emoji}</span>
    ${g.isNew ? '<i class="tag">NEW</i>' : ''}
    <button class="fav ${fav ? 'on' : ''}" data-fav="${g.id}" aria-label="Favorit">${fav ? '♥' : '♡'}</button>
    <h3>${esc(g.name)}</h3>
    <p class="meta">⭐ ${g.rating} · 👥 ${g.players} pemain</p>
    <button class="neon-btn small" data-play="${g.id}">▶ Play Now</button>
  </article>`;
}

function renderGames() {
  let list = GAMES.filter(g =>
    (!view.cat || g.cats.includes(view.cat)) &&
    (!view.q || g.name.toLowerCase().includes(view.q) || g.cats.some(c => c.toLowerCase().includes(view.q))));
  if (view.f === 'popular') list = [...list].sort((a, b) => parseFloat(b.players) - parseFloat(a.players));
  if (view.f === 'top') list = [...list].sort((a, b) => b.rating - a.rating);
  if (view.f === 'new') list = list.filter(g => g.isNew);

  $('#gameList').innerHTML = list.length
    ? list.map(gameCard).join('')
    : '<p class="meta">Tidak ada game yang cocok. Coba kata lain atau kategori lain.</p>';
  $('#gHint').textContent = view.cat ? `Kategori: ${view.cat}`
    : view.q ? `Hasil untuk "${view.q}"` : 'Most popular games right now';
  $$('#pills .pill').forEach(p => p.classList.toggle('on', p.dataset.f === view.f));
  $$('#catList .cat').forEach(c => c.classList.toggle('on', c.dataset.cat === view.cat));
}

/* ---------- daily challenge ---------- */
const dailyGame = () => GAMES[Math.floor(Date.now() / 864e5) % GAMES.length];
function renderDaily() {
  const dg = dailyGame();
  const done = store.get('daily', '') === today();
  $('#dailyText').textContent = `Hari ini: ${dg.name} — raih skor terbaik!`;
  const btn = $('#joinDaily');
  btn.textContent = done ? 'Selesai hari ini ✓' : 'Join Challenge →';
  btn.disabled = done;
  btn.dataset.id = dg.id;
}
function tickCountdown() {
  const now = new Date(), end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const s = Math.max(0, Math.floor((end - now) / 1000));
  $('#cd').textContent = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map(v => String(v).padStart(2, '0')).join(' : ');
}

/* ---------- leaderboard (online via Firebase, atau lokal) ---------- */
async function renderLeaderboard() {
  let rows = null;
  let src = 'Mode lokal — Firebase belum diatur (lihat js/firebase.js)';
  if (backend.enabled) {
    try {
      const top = await backend.topScores(8);
      if (top && top.length) {
        rows = top.map((t, i) => ({ n: t.name, g: gameName(t.game), p: t.score, a: ['👑', '⭐', '🥉'][i] || '🎮' }));
        src = 'Live dari Firebase';
      }
    } catch (e) {
      console.warn('Gagal memuat leaderboard online:', e);
      src = 'Gagal memuat online — menampilkan data lokal';
    }
  }
  if (!rows) {
    rows = [...SAMPLE_BOTS, { n: playerName() + ' (kamu)', p: totalBest(), a: '🎮', me: 1 }]
      .sort((a, b) => b.p - a.p);
  }
  $('#lbList').innerHTML = rows.slice(0, 8).map((r, i) => `
    <li class="${i < 3 ? 'gold' : ''} ${r.me ? 'me' : ''}">
      <b>${i + 1}</b>
      <span>${esc(r.a)} ${esc(r.n)}${r.g ? `<small style="color:var(--m)"> · ${esc(r.g)}</small>` : ''}</span>
      <em>${Number(r.p).toLocaleString('id-ID')} pts</em>
    </li>`).join('');
  $('#lbSource').textContent = src;
}

function renderLevel() {
  $('#lvl').textContent = Math.floor(totalBest() / 500) + 1;
}

/* ---------- favorit & toast ---------- */
function toggleFav(id) {
  favs = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id];
  store.set('fav', favs);
  renderGames();
  toast(favs.includes(id) ? 'Ditambahkan ke favorit ♥' : 'Dihapus dari favorit');
}
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* ---------- modal permainan ---------- */
function openGame(id, daily = false) {
  const g = GAMES.find(x => x.id === id);
  if (!g) return;
  current = id; curDaily = daily;
  $('#gTitle').textContent = g.name;
  $('#result').classList.remove('show');
  if (cleanup) cleanup();
  const box = $('#gameBox');
  box.innerHTML = '';
  cleanup = runGame(g.game, box, score => finish(id, score, daily));
  $('#gm').classList.add('show');
}
function closeModal(id) {
  if (id === 'gm' && cleanup) { cleanup(); cleanup = null; }
  $('#' + id).classList.remove('show');
}

async function finish(id, score, daily) {
  const best = store.get('best', {});
  if (score > (best[id] || 0)) { best[id] = score; store.set('best', best); }
  const h = store.get('history', []);
  h.unshift({ game: id, score, at: Date.now() });
  store.set('history', h.slice(0, 20));
  store.set('last', id);
  if (daily) store.set('daily', today());

  $('#resScore').textContent = score;
  $('#result').classList.add('show');
  renderDaily();
  renderLevel();

  let msg = 'Skor tersimpan di perangkat ini';
  if (backend.enabled) {
    try {
      await backend.submitScore({ name: playerName(), game: id, score });
      msg = 'Skor dikirim ke leaderboard online ✓';
    } catch (e) {
      console.warn(e);
      msg = 'Gagal kirim online — tersimpan lokal';
    }
  }
  toast(msg);
  renderLeaderboard();
}

/* ---------- navigasi ---------- */
const jump = sel => { const el = $(sel); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); };
function navTo(name, el) {
  if (el) $$('nav a').forEach(a => a.classList.toggle('active', a === el));
  switch (name) {
    case 'home': return scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    case 'explore': view = { f: 'all', cat: null, q: '' }; $('#q').value = ''; renderGames(); return jump('#games');
    case 'cats': return jump('#cats');
    case 'trending': view.f = 'popular'; renderGames(); return jump('#games');
    case 'new': view.f = 'new'; renderGames(); return jump('#games');
    case 'lb': return jump('#lbBox');
    case 'daily': return jump('#daily');
    case 'about': return $('#about').classList.add('show');
  }
}

/* ---------- intro 3D ---------- */
function endIntro() {
  if (stopIntro) { stopIntro(); stopIntro = null; }
  store.set('introSeen', true);
  const el = $('#intro');
  el.classList.add('hide');
  setTimeout(() => { el.style.display = 'none'; }, 800);
}
function playIntro() {
  const el = $('#intro');
  el.style.display = 'block';
  el.classList.remove('hide');
  stopIntro = runIntro($('#introCanvas'), endIntro);
}

/* ---------- event delegation ---------- */
document.addEventListener('click', e => {
  const hit = sel => e.target.closest(sel);
  let el;
  if ((el = hit('[data-play]'))) return openGame(el.dataset.play);
  if ((el = hit('[data-fav]'))) return toggleFav(el.dataset.fav);
  if ((el = hit('[data-cat]'))) {
    view.cat = view.cat === el.dataset.cat ? null : el.dataset.cat;
    renderGames(); return jump('#games');
  }
  if ((el = hit('[data-f]'))) { view.f = el.dataset.f; return renderGames(); }
  if ((el = hit('nav a[data-nav]'))) return navTo(el.dataset.nav, el);
  if ((el = hit('[data-nav]'))) return navTo(el.dataset.nav);
  if ((el = hit('[data-close]'))) return closeModal(el.dataset.close);
  if ((el = hit('[data-dot]'))) { goSlide(+el.dataset.dot); return restartHeroTimer(); }
  if (hit('[data-prev]')) { goSlide(slide - 1); return restartHeroTimer(); }
  if (hit('[data-next]')) { goSlide(slide + 1); return restartHeroTimer(); }
  if (hit('[data-hplay]')) return openGame(store.get('last', 'memory'));

  switch (e.target.id) {
    case 'qBtn': view.q = $('#q').value.trim().toLowerCase(); renderGames(); return jump('#games');
    case 'joinDaily': if ($('#joinDaily').dataset.id) openGame($('#joinDaily').dataset.id, true); return;
    case 'learn': case 'news': return navTo('about');
    case 'bell': {
      const n = store.get('history', []).length;
      return toast(n ? `Kamu sudah bermain ${n} kali. Ayo main lagi!` : 'Belum ada notifikasi baru.');
    }
    case 'gear':
      $('#histInfo').textContent = `Riwayat tersimpan: ${store.get('history', []).length} permainan`;
      $('#reduceToggle').checked = reduce;
      return $('#settings').classList.add('show');
    case 'replay': closeModal('settings'); return playIntro();
    case 'skipIntro': return endIntro();
    case 'again': return openGame(current, curDaily);
    case 'restart': return openGame(current, curDaily);
    case 'reset':
      store.set('fav', []); store.set('history', []); store.set('best', {}); store.set('daily', ''); store.set('last', '');
      favs = [];
      renderGames(); renderDaily(); renderLevel(); renderLeaderboard();
      $('#histInfo').textContent = 'Riwayat tersimpan: 0 permainan';
      return toast('Data lokal direset');
  }
  if (e.target.classList.contains('modal')) closeModal(e.target.id);
});

$('#reduceToggle').addEventListener('change', e => { store.set('reduce', e.target.checked); location.reload(); });
$('#q').addEventListener('keydown', e => { if (e.key === 'Enter') { view.q = e.target.value.trim().toLowerCase(); renderGames(); jump('#games'); } });
$('#q').addEventListener('input', e => { view.q = e.target.value.trim().toLowerCase(); renderGames(); });

/* ---------- boot ---------- */
renderHero();
renderCats();
renderGames();
renderDaily();
renderLevel();
renderLeaderboard();
tickCountdown();
setInterval(tickCountdown, 1000);
restartHeroTimer();
startHero($('#hero3d'));

if (store.get('introSeen', false)) $('#intro').style.display = 'none';
else playIntro();

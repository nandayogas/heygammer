// js/games/arcade.js — Football Penalty, Basketball, Endless Runner, Fruit Match
import { R, DIR_KEYS, PAD, wireControls, splash, holdControls, RUNNERS } from './shared.js';

/* ---------- 7. FOOTBALL PENALTY ---------- */
RUNNERS.penalty = (b, done, ctl) => {
  const W = 320, H = 240;
  b.innerHTML = `<div class="info">Pilih arah, tunggu kiper bergerak, lalu tendang!</div>
    <canvas id="pc" width="${W}" height="${H}" class="gcanvas"></canvas>
    <div class="pad race-pad"><button data-aim="0">◀ KIRI</button><button data-aim="1">TENGAH</button><button data-aim="2">KANAN ▶</button></div>
    <button class="neon-btn" id="kick">⚽ TENDANG</button>`;
  const g = b.querySelector('#pc').getContext('2d');
  const zc = a => a * (W / 3) + W / 6;
  let aim = 1, shots = 5, score = 0, streak = 0, kx = W / 2, kdir = 1, kspeed = 110;
  let ball = null, msg = '', msgT = 0, last = 0, raf = 0, over = false, started = false;
  const setAim = a => { aim = a; b.querySelectorAll('[data-aim]').forEach(x => x.classList.toggle('on', +x.dataset.aim === a)); };
  b.querySelectorAll('[data-aim]').forEach(x => { x.onclick = () => setAim(+x.dataset.aim); });
  setAim(1);
  ctl.score(0); ctl.level(`Sisa ${shots}`);
  const finish = () => { if (over) return; over = true; cancelAnimationFrame(raf); done(score); };
  const kick = () => {
    if (!started || over || ball || shots <= 0 || ctl.paused()) return;
    ball = { t: 0, tx: zc(aim), saved: Math.abs(kx - zc(aim)) < 45 };
    shots--; ctl.level(`Sisa ${shots}`);
  };
  b.querySelector('#kick').onclick = kick;
  const draw = () => {
    g.fillStyle = '#14532d'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(40, 20, W - 80, 70);
    g.fillStyle = '#1d4ed8'; g.fillRect(kx - 22, 26, 44, 16);
    let bx = W / 2, by = H - 40, r = 9;
    if (ball) {
      const k = Math.min(1, ball.t / 0.45);
      bx = W / 2 + (ball.tx - W / 2) * k;
      by = (H - 40) + (60 - (H - 40)) * k;
      r = 9 - 4 * k;
    }
    g.fillStyle = '#fbbf24'; g.beginPath(); g.arc(bx, by, r, 0, Math.PI * 2); g.fill();
    if (msgT > 0 && msg) { g.fillStyle = '#fde68a'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText(msg, W / 2, H / 2 + 10); }
  };
  const frame = now => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (started && !ctl.paused()) {
      kx += kdir * kspeed * dt;
      if (kx < 60) { kx = 60; kdir = 1; }
      if (kx > W - 60) { kx = W - 60; kdir = -1; }
      if (ball) {
        ball.t += dt;
        if (ball.t >= 0.45) {
          if (ball.saved) { streak = 0; msg = 'DITEPIS!'; }
          else { streak++; score += 100 * streak; msg = streak > 1 ? `GOL! x${streak}` : 'GOL!'; ctl.score(score); }
          ball = null; msgT = 0.9; kspeed = Math.min(260, kspeed + 12);
          if (shots <= 0) { draw(); return finish(); }
        }
      }
      if (msgT > 0) msgT -= dt;
    }
    draw();
    if (!over) raf = requestAnimationFrame(frame);
  };
  splash(b, 'Football Penalty', 'Lima tendangan. Pilih arah, tunggu kiper bergerak, lalu tendang! Gol beruntun memberi bonus.', () => { started = true; });
  raf = requestAnimationFrame(frame);
  return () => { over = true; cancelAnimationFrame(raf); };
};

/* ---------- 8. BASKETBALL CHALLENGE ---------- */
RUNNERS.basket = (b, done, ctl) => {
  const W = 320, H = 260;
  b.innerHTML = `<div class="info">Tekan TEMBAK saat penanda masuk zona hijau. Makin banyak masuk, zona makin kecil!</div>
    <canvas id="bc" width="${W}" height="${H}" class="gcanvas"></canvas>
    <button class="neon-btn" id="shoot">🏀 TEMBAK</button>`;
  const g = b.querySelector('#bc').getContext('2d');
  let shots = 5, score = 0, streak = 0, mk = 0, mdir = 1, mspeed = 0.9;
  let shot = null, msg = '', msgT = 0, last = 0, raf = 0, over = false, started = false;
  const zone = () => Math.max(0.05, 0.14 - streak * 0.015);
  const finish = () => { if (over) return; over = true; cancelAnimationFrame(raf); done(score); };
  const shoot = () => {
    if (!started || over || shot || shots <= 0 || ctl.paused()) return;
    const d = Math.abs(mk - 0.5);
    shot = { t: 0, made: d <= zone(), perfect: d <= 0.03 };
    shots--; ctl.level(`Sisa ${shots}`);
  };
  b.querySelector('#shoot').onclick = shoot;
  const draw = () => {
    g.fillStyle = '#0f172a'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e5e7eb'; g.fillRect(W / 2 - 55, 30, 110, 70);
    g.strokeStyle = '#f97316'; g.lineWidth = 4; g.beginPath(); g.moveTo(W / 2 - 22, 92); g.lineTo(W / 2 + 22, 92); g.stroke();
    let bx = W / 2, by = H - 120, r = 14;
    if (shot) {
      const k = Math.min(1, shot.t / 0.6);
      by = (H - 120) + (100 - (H - 120)) * k;
      bx = W / 2 + (shot.made ? 0 : 60) * k;
      r = 14 - 4 * k;
    }
    g.fillStyle = '#f97316'; g.beginPath(); g.arc(bx, by, r, 0, Math.PI * 2); g.fill();
    const mx = 20, my = H - 40, mw = W - 40, zh = zone();
    g.fillStyle = '#334155'; g.fillRect(mx, my, mw, 16);
    g.fillStyle = '#22c55e'; g.fillRect(mx + mw * (0.5 - zh), my, mw * zh * 2, 16);
    g.fillStyle = '#fbbf24'; g.fillRect(mx + mw * mk - 3, my - 6, 6, 28);
    if (msgT > 0 && msg) { g.fillStyle = '#fde68a'; g.font = 'bold 24px sans-serif'; g.textAlign = 'center'; g.fillText(msg, W / 2, 190); }
  };
  const frame = now => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (started && !ctl.paused()) {
      mk += mdir * mspeed * dt;
      if (mk > 1) { mk = 1; mdir = -1; }
      if (mk < 0) { mk = 0; mdir = 1; }
      if (shot) {
        shot.t += dt;
        if (shot.t >= 0.6) {
          if (shot.made) { score += shot.perfect ? 200 : 100; streak++; msg = shot.perfect ? 'PERFECT!' : 'MASUK!'; ctl.score(score); }
          else { streak = 0; msg = 'MELESET'; }
          shot = null; msgT = 0.9; mspeed = Math.min(2.2, mspeed + 0.12);
          if (shots <= 0) { draw(); return finish(); }
        }
      }
      if (msgT > 0) msgT -= dt;
    }
    draw();
    if (!over) raf = requestAnimationFrame(frame);
  };
  ctl.score(0); ctl.level(`Sisa ${shots}`);
  splash(b, 'Basketball Challenge', 'Lima lemparan. Tekan TEMBAK saat penanda di zona hijau. PERFECT memberi poin dua kali lipat!', () => { started = true; });
  raf = requestAnimationFrame(frame);
  return () => { over = true; cancelAnimationFrame(raf); };
};

/* ---------- 9. ENDLESS RUNNER ---------- */
RUNNERS.runner = (b, done, ctl) => {
  const W = 360, H = 200, GY = 170;
  b.innerHTML = `<div class="info">Tekan LOMPAT atau Spasi untuk melewati rintangan.</div>
    <canvas id="rn" width="${W}" height="${H}" class="gcanvas"></canvas>
    <div class="pad"><button data-k="U" style="min-width:150px">⤒ LOMPAT</button></div>`;
  const g = b.querySelector('#rn').getContext('2d');
  let py = GY, vy = 0, onGround = true, obs = [], spd = 220, dist = 0, t = 0, nextObs = 1;
  let last = 0, raf = 0, over = false, started = false;
  const score = () => Math.floor(dist / 10);
  const finish = () => { if (over) return; over = true; cancelAnimationFrame(raf); done(score()); };
  const jump = () => { if (!started || over || ctl.paused() || !onGround) return; vy = -560; onGround = false; };
  const unwire = wireControls(b, d => { if (d === 'U') jump(); });
  const onSpace = e => { if (e.code === 'Space') { e.preventDefault(); jump(); } };
  addEventListener('keydown', onSpace);
  const draw = () => {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1e1b4b'); sky.addColorStop(1, '#0c4a6e');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#334155'; g.fillRect(0, GY, W, H - GY);
    g.fillStyle = '#c084fc'; obs.forEach(o => g.fillRect(o.x, GY - o.h, o.w, o.h));
    g.fillStyle = '#22d3ee'; g.fillRect(40, py - 30, 24, 30);
    g.fillStyle = '#fff'; g.fillRect(50, py - 22, 6, 6);
  };
  const frame = now => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (started && !ctl.paused()) {
      t += dt;
      spd = Math.min(480, 220 + t * 8);
      dist += spd * dt;
      ctl.score(score()); ctl.level(`Lv ${1 + Math.floor(t / 15)}`);
      vy += 1500 * dt; py += vy * dt;
      if (py >= GY) { py = GY; vy = 0; onGround = true; }
      nextObs -= dt;
      if (nextObs <= 0) {
        obs.push({ x: W + 10, w: 14 + Math.random() * 12, h: 22 + Math.random() * 26 });
        nextObs = 0.9 + Math.random() * 0.9 - Math.min(0.35, t * 0.01);
      }
      obs.forEach(o => { o.x -= spd * dt; });
      obs = obs.filter(o => o.x > -40);
      if (obs.some(o => 40 < o.x + o.w && 64 > o.x && py > GY - o.h)) { draw(); return finish(); }
    }
    draw();
    if (!over) raf = requestAnimationFrame(frame);
  };
  splash(b, 'Endless Runner', 'Lompat melewati rintangan ungu. Makin jauh, makin cepat!', () => { started = true; });
  raf = requestAnimationFrame(frame);
  return () => { over = true; cancelAnimationFrame(raf); unwire(); removeEventListener('keydown', onSpace); };
};

/* ---------- 10. FRUIT MATCH ---------- */
RUNNERS.fruit = (b, done, ctl) => {
  const N = 6, F = ['🍎', '🍊', '🍇', '🍓', '🍌', '🫐'];
  let grid = [], sel = null, moves = 20, score = 0, busy = false, started = false, over = false, alive = true;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const rnd = () => F[R(F.length)];
  const matches = () => {
    const hit = new Set();
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const v = grid[r][c];
      if (c + 2 < N && v === grid[r][c + 1] && v === grid[r][c + 2]) hit.add(r + ',' + c).add(r + ',' + (c + 1)).add(r + ',' + (c + 2));
      if (r + 2 < N && v === grid[r + 1][c] && v === grid[r + 2][c]) hit.add(r + ',' + c).add((r + 1) + ',' + c).add((r + 2) + ',' + c);
    }
    return hit;
  };
  // Papan tanpa langkah valid akan membuat pemain terkunci; acak ulang sampai ada langkah.
  const anyMove = () => {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const r2 = r + dr, c2 = c + dc;
      if (r2 >= N || c2 >= N) continue;
      [grid[r][c], grid[r2][c2]] = [grid[r2][c2], grid[r][c]];
      const ok = matches().size > 0;
      [grid[r][c], grid[r2][c2]] = [grid[r2][c2], grid[r][c]];
      if (ok) return true;
    }
    return false;
  };
  const reshuffle = () => {
    do {
      grid = Array.from({ length: N }, () => Array.from({ length: N }, rnd));
      for (let g = 0; matches().size && g < 100; g++) {
        matches().forEach(k => { const [r, c] = k.split(',').map(Number); grid[r][c] = rnd(); });
      }
    } while (!anyMove());
  };
  const render = () => {
    const box = b.querySelector('.fgrid');
    if (!box) return;
    box.innerHTML = grid.map((row, r) => row.map((v, c) =>
      `<button data-r="${r}" data-c="${c}" class="${sel && sel[0] === r && sel[1] === c ? 'sel' : ''}">${v}</button>`).join('')).join('');
  };
  const finish = () => { if (over) return; over = true; done(score); };
  const resolve = async () => {
    let combo = 0, m;
    while ((m = matches()).size) {
      combo++;
      score += m.size * 10 * combo;
      ctl.score(score);
      m.forEach(k => { const [r, c] = k.split(',').map(Number); grid[r][c] = null; });
      render();
      await wait(250); if (!alive) return;
      for (let c = 0; c < N; c++) {
        const col = [];
        for (let r = N - 1; r >= 0; r--) if (grid[r][c] !== null) col.push(grid[r][c]);
        for (let r = N - 1; r >= 0; r--) grid[r][c] = col.length ? col.shift() : rnd();
      }
      render();
      await wait(200); if (!alive) return;
    }
  };
  const trySwap = async (r1, c1, r2, c2) => {
    busy = true;
    [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
    render();
    if (!matches().size) {
      await wait(220); if (!alive) return;
      [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
      render(); busy = false; return;
    }
    moves--; ctl.level(`Langkah ${moves}`);
    await resolve(); if (!alive) return;
    if (!anyMove()) {
      reshuffle(); render();
      const info = b.querySelector('.info'); if (info) info.textContent = 'Tidak ada langkah tersisa — papan diacak ulang.';
    }
    busy = false;
    if (moves <= 0) finish();
  };
  b.innerHTML = `<div class="info">Tukar dua buah bersebelahan untuk membuat deret tiga atau lebih. Kamu punya 20 langkah.</div><div class="fgrid"></div>`;
  b.querySelector('.fgrid').onclick = e => {
    const t = e.target.closest('button');
    if (!t || !started || busy || over || ctl.paused()) return;
    const r = +t.dataset.r, c = +t.dataset.c;
    if (!sel) { sel = [r, c]; render(); return; }
    const [r0, c0] = sel; sel = null;
    if (r0 === r && c0 === c) { render(); return; }
    if (Math.abs(r0 - r) + Math.abs(c0 - c) === 1) { trySwap(r0, c0, r, c); return; }
    sel = [r, c]; render();
  };
  reshuffle();
  ctl.score(0); ctl.level(`Langkah ${moves}`);
  splash(b, 'Fruit Match', 'Tukar buah bersebelahan untuk membuat deret tiga atau lebih. Kombo beruntun memberi poin lebih besar!', () => { started = true; });
  render();
  return () => { alive = false; over = true; };
};


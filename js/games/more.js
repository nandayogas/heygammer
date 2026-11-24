// js/games/more.js — Space Shooter, Zombie Survival, Block Puzzle
import { R, DIR_KEYS, PAD, wireControls, splash, holdControls, RUNNERS } from './shared.js';

/* ---------- 11. SPACE SHOOTER ---------- */
RUNNERS.shooter = (b, done, ctl) => {
  const W = 320, H = 440;
  b.innerHTML = `<div class="info">Geser kiri-kanan. Peluru menembak otomatis. Jangan biarkan musuh lolos!</div>
    <canvas id="sh" width="${W}" height="${H}" class="gcanvas"></canvas>${PAD}`;
  const g = b.querySelector('#sh').getContext('2d');
  const ctrl = holdControls(b);
  let px = W / 2, bullets = [], foes = [], score = 0, lives = 3, t = 0, fire = 0, spawn = 0;
  let last = 0, raf = 0, over = false, started = false;
  const finish = () => { if (over) return; over = true; cancelAnimationFrame(raf); done(score); };
  const draw = () => {
    g.fillStyle = '#050414'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#22d3ee'; g.beginPath(); g.moveTo(px, H - 40); g.lineTo(px - 18, H - 14); g.lineTo(px + 18, H - 14); g.closePath(); g.fill();
    g.fillStyle = '#fde047'; bullets.forEach(bl => g.fillRect(bl.x - 2, bl.y, 4, 10));
    g.fillStyle = '#f472b6'; foes.forEach(f => { g.beginPath(); g.arc(f.x, f.y, 14, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = '#fbbf24'; g.font = 'bold 14px sans-serif'; g.textAlign = 'left'; g.fillText('❤'.repeat(Math.max(0, lives)), 8, 20);
  };
  const frame = now => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (started && !ctl.paused()) {
      t += dt;
      px = Math.max(24, Math.min(W - 24, px + ((ctrl.held.R ? 1 : 0) - (ctrl.held.L ? 1 : 0)) * 240 * dt));
      fire -= dt;
      if (fire <= 0) { bullets.push({ x: px, y: H - 40 }); fire = 0.22; }
      spawn -= dt;
      if (spawn <= 0) {
        foes.push({ x: 20 + Math.random() * (W - 40), y: -16, v: 70 + Math.random() * 50 + t * 2 });
        spawn = Math.max(0.35, 1.1 - t * 0.015) * (0.6 + Math.random() * 0.8);
      }
      bullets.forEach(bl => { bl.y -= 460 * dt; });
      bullets = bullets.filter(bl => bl.y > -10);
      foes.forEach(f => { f.y += f.v * dt; });
      foes.forEach(f => {
        bullets.forEach(bl => {
          if (!f.dead && Math.abs(bl.x - f.x) < 16 && Math.abs(bl.y - f.y) < 16) {
            f.dead = true; bl.y = -99; score += 10; ctl.score(score); ctl.level(`Lv ${1 + Math.floor(score / 100)}`);
          }
        });
      });
      bullets = bullets.filter(bl => bl.y > -50);
      foes.forEach(f => {
        if (f.dead) return;
        if (Math.abs(f.x - px) < 26 && f.y > H - 60 && f.y < H - 10) { f.dead = true; lives--; }
        else if (f.y > H + 16) { f.dead = true; lives--; }
      });
      foes = foes.filter(f => !f.dead);
      if (lives <= 0) { draw(); return finish(); }
    }
    draw();
    if (!over) raf = requestAnimationFrame(frame);
  };
  ctl.score(0); ctl.level('Lv 1');
  splash(b, 'Space Shooter', 'Tiga nyawa. Geser pesawatmu dan hancurkan musuh sebelum mereka lolos.', () => { started = true; });
  raf = requestAnimationFrame(frame);
  return () => { over = true; cancelAnimationFrame(raf); ctrl.off(); };
};

/* ---------- 12. ZOMBIE SURVIVAL ---------- */
RUNNERS.zombie = (b, done, ctl) => {
  const W = 320, H = 400;
  b.innerHTML = `<div class="info">Gerak dengan panah. Peluru menembak otomatis ke zombi terdekat.</div>
    <canvas id="zb" width="${W}" height="${H}" class="gcanvas"></canvas>${PAD}`;
  const g = b.querySelector('#zb').getContext('2d');
  const ctrl = holdControls(b);
  const clamp = (v, a, z) => Math.max(a, Math.min(z, v));
  let px = W / 2, py = H / 2, hp = 100, score = 0, zs = [], shots = [], fire = 0, spawn = 0, t = 0;
  let last = 0, raf = 0, over = false, started = false;
  const finish = () => { if (over) return; over = true; cancelAnimationFrame(raf); done(score); };
  const nearest = () => {
    let best = null, bd = Infinity;
    zs.forEach(z => { const d = Math.hypot(z.x - px, z.y - py); if (d < bd) { bd = d; best = z; } });
    return best;
  };
  const draw = () => {
    g.fillStyle = '#1a2e1a'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#38bdf8'; g.beginPath(); g.arc(px, py, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4ade80'; zs.forEach(z => { g.beginPath(); g.arc(z.x, z.y, 10, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = '#fde047'; shots.forEach(s => { g.beginPath(); g.arc(s.x, s.y, 3, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = '#ef4444'; g.fillRect(10, 10, (W - 20) * Math.max(0, hp) / 100, 8);
  };
  const frame = now => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (started && !ctl.paused()) {
      t += dt;
      const h = ctrl.held;
      let dx = (h.R ? 1 : 0) - (h.L ? 1 : 0), dy = (h.D ? 1 : 0) - (h.U ? 1 : 0);
      if (dx && dy) { dx *= 0.707; dy *= 0.707; }
      px = clamp(px + dx * 150 * dt, 12, W - 12);
      py = clamp(py + dy * 150 * dt, 12, H - 12);
      spawn -= dt;
      if (spawn <= 0) {
        const edge = Math.floor(Math.random() * 4);
        let x, y;
        if (edge === 0) { x = -10; y = Math.random() * H; }
        else if (edge === 1) { x = W + 10; y = Math.random() * H; }
        else if (edge === 2) { x = Math.random() * W; y = -10; }
        else { x = Math.random() * W; y = H + 10; }
        zs.push({ x, y, hp: t > 60 ? 2 : 1 });
        spawn = Math.max(0.45, 1.5 - t * 0.012) * (0.6 + Math.random() * 0.8);
      }
      const sp = 32 + t * 0.35;
      zs.forEach(z => {
        const d = Math.hypot(px - z.x, py - z.y) || 1;
        z.x += (px - z.x) / d * sp * dt;
        z.y += (py - z.y) / d * sp * dt;
        if (d < 16) hp -= 22 * dt;
      });
      fire -= dt;
      const tg = nearest();
      if (fire <= 0 && tg) {
        const d = Math.hypot(tg.x - px, tg.y - py) || 1;
        shots.push({ x: px, y: py, vx: (tg.x - px) / d * 380, vy: (tg.y - py) / d * 380 });
        fire = 0.35;
      }
      shots.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; });
      shots = shots.filter(s => s.x > -10 && s.x < W + 10 && s.y > -10 && s.y < H + 10);
      zs.forEach(z => {
        shots.forEach(s => {
          if (!s.dead && !z.dead && Math.hypot(s.x - z.x, s.y - z.y) < 14) {
            s.dead = true; z.hp--;
            if (z.hp <= 0) { z.dead = true; score += 10; ctl.score(score); }
          }
        });
      });
      shots = shots.filter(s => !s.dead);
      zs = zs.filter(z => !z.dead);
      ctl.level(`Lv ${1 + Math.floor(t / 30)}`);
      if (hp <= 0) { draw(); return finish(); }
    }
    draw();
    if (!over) raf = requestAnimationFrame(frame);
  };
  ctl.score(0); ctl.level('Lv 1');
  splash(b, 'Zombie Survival', 'Bertahan selama mungkin. Zombi makin banyak dan makin cepat. Jaga jarakmu!', () => { started = true; });
  raf = requestAnimationFrame(frame);
  return () => { over = true; cancelAnimationFrame(raf); ctrl.off(); };
};

/* ---------- 13. BLOCK PUZZLE ---------- */
RUNNERS.block = (b, done, ctl) => {
  const C = 8, Rw = 14, S = 24;
  const SH = { O: [[1, 1], [1, 1]], I: [[1, 1, 1, 1]], T: [[0, 1, 0], [1, 1, 1]], L: [[1, 0], [1, 0], [1, 1]] };
  const COL = { O: '#fbbf24', I: '#22d3ee', T: '#c084fc', L: '#f472b6' };
  const KEYS = Object.keys(SH);
  const rot = m => m[0].map((_, c) => m.map(row => row[c]).reverse());
  b.innerHTML = `<div class="info">Susun blok agar baris penuh hilang. ◀ ▶ geser, ▲ putar, ▼ jatuhkan.</div>
    <canvas id="bk" width="${C * S}" height="${Rw * S}" class="gcanvas"></canvas>${PAD}`;
  const g = b.querySelector('#bk').getContext('2d');
  let board = Array.from({ length: Rw }, () => Array(C).fill(null));
  let cur = null, score = 0, lines = 0, tick = 0, last = 0, raf = 0, over = false, started = false;
  const finish = () => { if (over) return; over = true; cancelAnimationFrame(raf); done(score); };
  const fits = (m, px, py) => m.every((row, r) => row.every((v, c) =>
    !v || (px + c >= 0 && px + c < C && py + r < Rw && (py + r < 0 || !board[py + r][px + c]))));
  const spawn = () => {
    const k = KEYS[R(KEYS.length)];
    cur = { m: SH[k], k, x: 2, y: -1 };
    if (!fits(cur.m, cur.x, cur.y)) finish();
  };
  const lock = () => {
    cur.m.forEach((row, r) => row.forEach((v, c) => {
      if (v && cur.y + r >= 0) board[cur.y + r][cur.x + c] = COL[cur.k];
    }));
    let cleared = 0;
    board = board.filter(row => { if (row.every(Boolean)) { cleared++; return false; } return true; });
    while (board.length < Rw) board.unshift(Array(C).fill(null));
    if (cleared) {
      lines += cleared;
      score += 100 * cleared * cleared;
      ctl.score(score);
      ctl.level(`Lv ${1 + Math.floor(lines / 5)}`);
    }
    if (!over) spawn();
  };
  const move = (dx, dy) => {
    if (!cur || over || !fits(cur.m, cur.x + dx, cur.y + dy)) return false;
    cur.x += dx; cur.y += dy; return true;
  };
  const unwire = wireControls(b, d => {
    if (!started || over || ctl.paused() || !cur) return;
    if (d === 'L') move(-1, 0);
    else if (d === 'R') move(1, 0);
    else if (d === 'U') { const r = rot(cur.m); if (fits(r, cur.x, cur.y)) cur.m = r; }
    else if (d === 'D') { if (!move(0, 1)) lock(); }
  });
  const draw = () => {
    g.fillStyle = '#0b0618'; g.fillRect(0, 0, C * S, Rw * S);
    g.strokeStyle = 'rgba(168,85,247,.15)';
    for (let i = 0; i <= C; i++) { g.beginPath(); g.moveTo(i * S, 0); g.lineTo(i * S, Rw * S); g.stroke(); }
    for (let j = 0; j <= Rw; j++) { g.beginPath(); g.moveTo(0, j * S); g.lineTo(C * S, j * S); g.stroke(); }
    board.forEach((row, r) => row.forEach((v, c) => {
      if (v) { g.fillStyle = v; g.fillRect(c * S + 1, r * S + 1, S - 2, S - 2); }
    }));
    if (cur) cur.m.forEach((row, r) => row.forEach((v, c) => {
      const y = cur.y + r;
      if (v && y >= 0) { g.fillStyle = COL[cur.k]; g.fillRect((cur.x + c) * S + 1, y * S + 1, S - 2, S - 2); }
    }));
  };
  const frame = now => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (started && !ctl.paused() && cur && !over) {
      tick += dt;
      const interval = Math.max(0.15, 0.6 - lines * 0.03);
      if (tick >= interval) { tick = 0; if (!move(0, 1)) lock(); }
    }
    draw();
    if (!over) raf = requestAnimationFrame(frame);
  };
  ctl.score(0); ctl.level('Lv 1');
  splash(b, 'Block Puzzle', 'Susun blok jatuh agar baris penuh hilang. Makin banyak baris sekaligus, makin besar skornya!', () => { started = true; spawn(); });
  raf = requestAnimationFrame(frame);
  return () => { over = true; cancelAnimationFrame(raf); unwire(); };
};

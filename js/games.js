// js/games.js
// Enam mini-game yang benar-benar bisa dimainkan.
// Setiap runner menerima (box, done, ctl) dan boleh mengembalikan fungsi cleanup.
//   ctl.score(n)    → update skor di header Game Mode
//   ctl.level(v)    → update level/progres di header Game Mode
//   ctl.paused()    → true saat pemain menekan Pause (loop realtime wajib mengecek ini)
//   done(score)     → dipanggil sekali saat permainan selesai

const R = n => Math.floor(Math.random() * n);
const DIR_KEYS = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' };
const PAD = `<div class="pad"><button data-k="U" aria-label="Atas">▲</button><div><button data-k="L" aria-label="Kiri">◀</button><button data-k="D" aria-label="Bawah">▼</button><button data-k="R" aria-label="Kanan">▶</button></div></div>`;

// Tombol di layar (HP) dan keyboard memakai handler yang sama.
function wireControls(box, onDir) {
  box.querySelectorAll('[data-k]').forEach(btn => { btn.onclick = () => onDir(btn.dataset.k); });
  const kh = e => { if (DIR_KEYS[e.key]) { e.preventDefault(); onDir(DIR_KEYS[e.key]); } };
  addEventListener('keydown', kh);
  return () => removeEventListener('keydown', kh);
}

// Layar pembuka dengan tombol Start. Di belakangnya permainan sudah siap tapi belum berjalan.
function splash(box, title, desc, start) {
  const s = document.createElement('div');
  s.className = 'splash';
  s.innerHTML = `<h3>${title}</h3><p>${desc}</p><button class="neon-btn">▶ START</button>`;
  s.querySelector('button').onclick = () => { s.remove(); start(); };
  box.appendChild(s);
}

const RUNNERS = {};

/* ---------- 1. MEMORY ---------- */
RUNNERS.memory = (b, done, ctl) => {
  const E = ['🚀', '🎮', '👾', '🏆', '💎', '⚡', '🧠', '🔥'];
  const deck = [...E, ...E].sort(() => Math.random() - 0.5);
  b.innerHTML = '<div class="info">Langkah: <span id="mv">0</span></div><div class="grid g4 mem"></div>';
  const grid = b.querySelector('.grid');
  let open = [], matched = 0, moves = 0, lock = false, started = false, t0 = 0;
  const timers = [];
  ctl.level(`0/${E.length}`);

  deck.forEach(emoji => {
    const c = document.createElement('button');
    c.className = 'card3d';
    c.setAttribute('aria-label', 'Kartu');
    c.innerHTML = `<span class="flip"><span class="face back">?</span><span class="face front">${emoji}</span></span>`;
    c.onclick = () => {
      if (!started || lock || c.classList.contains('up')) return;
      c.classList.add('up');
      open.push({ c, emoji });
      if (open.length < 2) return;
      moves++;
      b.querySelector('#mv').textContent = moves;
      lock = true;
      const [a, z] = open;
      if (a.emoji === z.emoji) {
        a.c.classList.add('ok'); z.c.classList.add('ok');
        matched++;
        ctl.level(`${matched}/${E.length}`);
        open = []; lock = false;
        if (matched === E.length) {
          const secs = (Date.now() - t0) / 1000;
          done(Math.max(100, Math.round(1200 - moves * 25 - secs * 5)));
        }
      } else {
        timers.push(setTimeout(() => {
          a.c.classList.remove('up'); z.c.classList.remove('up');
          open = []; lock = false;
        }, 700));
      }
    };
    grid.appendChild(c);
  });

  splash(b, 'Memory Challenge', 'Cocokkan 8 pasang kartu secepat mungkin. Makin sedikit langkah, makin tinggi skor.', () => {
    started = true; t0 = Date.now();
  });
  return () => timers.forEach(clearTimeout);
};

/* ---------- 2. TIC TAC TOE (lawan AI minimax) ---------- */
RUNNERS.ttt = (b, done, ctl) => {
  let s = Array(9).fill(''), over = false, started = false;
  const W = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const win = p => W.find(l => l.every(i => s[i] === p));
  const minimax = d => {
    const w = win('O'); if (w) return 10 - d;
    if (win('X')) return d - 10;
    if (s.every(Boolean)) return 0;
    let v = d % 2 === 0 ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) if (!s[i]) {
      s[i] = d % 2 === 0 ? 'O' : 'X';
      const r = minimax(d + 1);
      s[i] = '';
      v = d % 2 === 0 ? Math.max(v, r) : Math.min(v, r);
    }
    return v;
  };
  const bestMove = () => {
    let bi = -1, bv = -Infinity;
    for (let i = 0; i < 9; i++) if (!s[i]) {
      s[i] = 'O'; const v = minimax(1); s[i] = '';
      if (v > bv) { bv = v; bi = i; }
    }
    return bi;
  };
  b.innerHTML = '<div class="info" id="st">Kamu (X) vs AI (O)</div><div class="grid g3"></div>';
  const grid = b.querySelector('.grid'), st = b.querySelector('#st');
  const draw = () => {
    grid.innerHTML = '';
    s.forEach((v, i) => {
      const c = document.createElement('button');
      c.className = 'cell'; c.textContent = v; c.disabled = over || !!v || !started;
      c.onclick = () => move(i);
      grid.appendChild(c);
    });
  };
  const move = i => {
    if (!started || over || s[i]) return;
    s[i] = 'X';
    let w = win('X');
    if (!w && !s.every(Boolean)) {
      const ai = bestMove();
      if (ai >= 0) s[ai] = 'O';
      w = win('O');
    }
    draw();
    if (w) {
      over = true; draw();
      const won = s[w[0]] === 'X';
      st.textContent = won ? 'Kamu menang! 🎉' : 'AI menang!';
      return done(won ? 300 : 0);
    }
    if (s.every(Boolean)) { over = true; draw(); st.textContent = 'Seri!'; done(100); }
  };
  draw();
  splash(b, 'Tic Tac Toe', 'Kamu jadi X. Kalahkan AI yang sudah dilatih dengan minimax, atau minimal seri!', () => { started = true; draw(); });
};

/* ---------- 3. SNAKE (naik level setiap 50 poin, bisa di-pause) ---------- */
RUNNERS.snake = (b, done, ctl) => {
  b.innerHTML = `<canvas id="sn" width="320" height="320"></canvas>${PAD}`;
  const cv = b.querySelector('#sn'), ctx = cv.getContext('2d'), N = 16, S = 20;
  let snake = [{ x: 8, y: 8 }], dir = { x: 1, y: 0 }, nd = dir, score = 0, level = 1;
  let started = false, alive = true, tm = 0;
  const place = () => {
    let p;
    do { p = { x: R(N), y: R(N) }; } while (snake.some(q => q.x === p.x && q.y === p.y));
    return p;
  };
  let food = place();
  const draw = () => {
    ctx.fillStyle = '#0b0618'; ctx.fillRect(0, 0, 320, 320);
    ctx.fillStyle = '#f472b6'; ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 10;
    ctx.fillRect(food.x * S + 3, food.y * S + 3, S - 6, S - 6);
    ctx.shadowBlur = 0;
    snake.forEach((p, i) => { ctx.fillStyle = i ? '#a855f7' : '#22d3ee'; ctx.fillRect(p.x * S + 1, p.y * S + 1, S - 2, S - 2); });
  };
  const turn = k => {
    const m = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } }[k];
    if (m && !(m.x === -dir.x && m.y === -dir.y)) nd = m;
  };
  const step = () => {
    if (!alive) return;
    if (!started || ctl.paused()) { tm = setTimeout(step, 100); return; }
    dir = nd;
    const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || snake.some(p => p.x === h.x && p.y === h.y)) {
      alive = false; draw(); return done(score);
    }
    snake.unshift(h);
    if (h.x === food.x && h.y === food.y) {
      score += 10;
      ctl.score(score);
      const lv = 1 + Math.floor(score / 50);
      if (lv !== level) { level = lv; ctl.level(lv); }
      food = place();
    } else snake.pop();
    draw();
    tm = setTimeout(step, Math.max(60, 130 - (level - 1) * 12));
  };
  draw();
  ctl.level(1);
  splash(b, 'Snake Master', 'Makan makanan pink, jangan menabrak dinding atau badanmu sendiri. Tiap 50 poin naik level.', () => { started = true; });
  tm = setTimeout(step, 130);
  const unwire = wireControls(b, turn);
  return () => { alive = false; clearTimeout(tm); unwire(); };
};

/* ---------- 4. 2048 ---------- */
RUNNERS['2048'] = (b, done, ctl) => {
  let g = Array.from({ length: 4 }, () => Array(4).fill(0)), sc = 0, over = false, started = false;
  const add = () => {
    const e = [];
    g.forEach((row, y) => row.forEach((v, x) => { if (!v) e.push([x, y]); }));
    if (e.length) { const [x, y] = e[R(e.length)]; g[y][x] = Math.random() < 0.9 ? 2 : 4; }
  };
  add(); add();
  b.innerHTML = `<div class="info">Geser dengan panah atau tombol di bawah</div><div class="g2048"></div>${PAD}`;
  const el = b.querySelector('.g2048');
  const show = () => {
    el.innerHTML = '';
    g.flat().forEach(v => {
      const d = document.createElement('div');
      d.className = 'tile'; d.textContent = v || '';
      if (v) d.style.background = `hsl(${260 - Math.log2(v) * 18},75%,${35 + Math.log2(v) * 4}%)`;
      el.appendChild(d);
    });
  };
  const slide = row => {
    const r = row.filter(Boolean), out = [];
    for (let i = 0; i < r.length; i++) {
      if (r[i] === r[i + 1]) { out.push(r[i] * 2); sc += r[i] * 2; i++; }
      else out.push(r[i]);
    }
    while (out.length < 4) out.push(0);
    return out;
  };
  const isOver = () => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const v = g[y][x];
      if (!v) return false;
      if (x < 3 && g[y][x + 1] === v) return false;
      if (y < 3 && g[y + 1][x] === v) return false;
    }
    return true;
  };
  const move = k => {
    if (!started || over) return;
    const before = JSON.stringify(g);
    for (let i = 0; i < 4; i++) {
      const idx = [0, 1, 2, 3].map(j => k === 'L' ? [i, j] : k === 'R' ? [i, 3 - j] : k === 'U' ? [j, i] : [3 - j, i]);
      const line = slide(idx.map(([r, c]) => g[r][c]));
      idx.forEach(([r, c], j) => { g[r][c] = line[j]; });
    }
    if (JSON.stringify(g) !== before) {
      add(); show();
      ctl.score(sc);
      ctl.level(`Tile ${Math.max(...g.flat())}`);
      if (isOver()) { over = true; done(sc); }
    }
  };
  show();
  splash(b, '2048 Challenge', 'Gabungkan angka yang sama sampai dapat tile 2048. Hati-hati, papan bisa penuh!', () => { started = true; });
  return wireControls(b, move);
};

/* ---------- 5. ROCK PAPER SCISSORS (best of 5) ---------- */
RUNNERS.rps = (b, done, ctl) => {
  const names = ['✊ Batu', '✋ Kertas', '✌️ Gunting'], icons = ['✊', '✋', '✌️'];
  let wins = 0, losses = 0, rounds = 0, started = false;
  b.innerHTML = `<div class="info" id="st">Best of 5 · Pilih gerakanmu</div>
    <div class="rps-arena"><div id="pl">❔</div><span style="font-size:18px;color:var(--m)">VS</span><div id="ai">❔</div></div>
    <div class="row">${names.map((n, i) => `<button class="neon-btn" data-c="${i}">${n}</button>`).join('')}</div>`;
  ctl.level('Ronde 0/5');
  b.querySelectorAll('[data-c]').forEach(btn => btn.onclick = () => {
    if (!started || rounds >= 5) return;
    const c = +btn.dataset.c, a = R(3);
    rounds++;
    b.querySelector('#pl').textContent = icons[c];
    b.querySelector('#ai').textContent = icons[a];
    const res = (c - a + 3) % 3; // 0 seri, 1 menang, 2 kalah
    if (res === 1) wins++; else if (res === 2) losses++;
    b.querySelector('#st').textContent = (res === 0 ? 'Seri!' : res === 1 ? 'Kamu menang ronde ini!' : 'AI menang ronde ini!')
      + ` (${wins}-${losses}, ronde ${rounds}/5)`;
    ctl.score(wins * 100);
    ctl.level(`Ronde ${rounds}/5`);
    if (rounds === 5) {
      b.querySelectorAll('[data-c]').forEach(x => { x.disabled = true; });
      done(wins * 100);
    }
  });
  splash(b, 'Rock Paper Scissors', 'Lawan AI dalam 5 ronde. Menang satu ronde = 100 poin.', () => { started = true; });
};

/* ---------- 6. RACING FEVER (balap 3 lajur, koin, level naik seiring kecepatan) ---------- */
RUNNERS.racing = (b, done, ctl) => {
  const W = 300, H = 480, LANES = 3, PY = H - 90, CAR_W = 40, CAR_H = 70;
  b.innerHTML = `<canvas id="rc" width="${W}" height="${H}"></canvas>
    <div class="row race-pad"><button class="neon-btn" data-k="L">◀ Kiri</button><button class="neon-btn" data-k="R">Kanan ▶</button></div>`;
  const cv = b.querySelector('#rc'), ctx = cv.getContext('2d');
  const laneX = i => (W / LANES) * (i + 0.5);

  let lane = 1, x = laneX(1), dist = 0, coinPts = 0, score = 0, level = 1;
  let speed = 200, spawnT = 0.8, obs = [], coins = [], off = 0;
  let started = false, over = false, last = 0, raf = 0;

  const turn = k => {
    if (over) return;
    if (k === 'L' && lane > 0) lane--;
    if (k === 'R' && lane < LANES - 1) lane++;
  };

  const draw = () => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1e1b4b'); g.addColorStop(1, '#0b0618');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(168,85,247,.5)'; ctx.lineWidth = 3;
    ctx.setLineDash([22, 18]); ctx.lineDashOffset = -off;
    for (let i = 1; i < LANES; i++) {
      ctx.beginPath(); ctx.moveTo((W / LANES) * i, 0); ctx.lineTo((W / LANES) * i, H); ctx.stroke();
    }
    ctx.setLineDash([]);

    coins.forEach(c => {
      ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(laneX(c.l), c.y, 11, 0, Math.PI * 2); ctx.fill();
    });

    obs.forEach(o => {
      ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 14;
      ctx.fillRect(laneX(o.l) - CAR_W / 2, o.y - CAR_H / 2, CAR_W, CAR_H);
    });

    // Mobil pemain
    ctx.fillStyle = '#22d3ee'; ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 16;
    ctx.fillRect(x - CAR_W / 2, PY - CAR_H / 2, CAR_W, CAR_H);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0b0618';
    ctx.fillRect(x - CAR_W / 2 + 6, PY - CAR_H / 2 + 12, CAR_W - 12, 16);
  };

  // Mengembalikan false saat tabrakan (permainan selesai).
  const update = dt => {
    dist += speed * dt;
    off = (off + speed * dt) % 40;
    x += (laneX(lane) - x) * Math.min(1, dt * 12);

    spawnT -= dt;
    if (spawnT <= 0) {
      const l = R(LANES);
      obs.push({ l, y: -CAR_H });
      if (Math.random() < 0.6) {
        let cl = R(LANES);
        if (cl === l) cl = (cl + 1) % LANES;
        coins.push({ l: cl, y: -40 });
      }
      spawnT = Math.max(0.35, 0.7 + Math.random() * 0.6 - (level - 1) * 0.05);
    }

    obs.forEach(o => { o.y += speed * dt; });
    coins.forEach(c => { c.y += speed * dt; });

    for (const c of coins) {
      if (Math.abs(laneX(c.l) - x) < 34 && Math.abs(c.y - PY) < 40) { c.y = H + 999; coinPts += 25; }
    }
    coins = coins.filter(c => c.y < H + 30);

    for (const o of obs) {
      if (Math.abs(laneX(o.l) - x) < 36 && Math.abs(o.y - PY) < CAR_H - 6) return false;
    }
    obs = obs.filter(o => o.y < H + CAR_H);

    score = Math.floor(dist / 10) + coinPts;
    ctl.score(score);
    const lv = 1 + Math.floor(score / 250);
    if (lv !== level) { level = lv; ctl.level(lv); }
    speed = Math.min(520, 200 + (level - 1) * 40);
    return true;
  };

  const frame = now => {
    if (over) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (started && !ctl.paused()) {
      if (!update(dt)) {
        over = true;
        draw();
        return done(score);
      }
    }
    draw();
    raf = requestAnimationFrame(frame);
  };

  ctl.level(1);
  draw();
  raf = requestAnimationFrame(frame);
  splash(b, 'Racing Fever', 'Geser ke kiri atau kanan untuk menghindari mobil merah. Ambil koin emas untuk tambahan poin!', () => { started = true; last = 0; });
  const unwire = wireControls(b, turn);
  return () => { over = true; cancelAnimationFrame(raf); unwire(); };
};

/** Jalankan game berdasarkan key. Mengembalikan fungsi cleanup (atau null). */
export function runGame(key, box, done, ctl) {
  const fn = RUNNERS[key];
  return fn ? fn(box, done, ctl) || null : null;
}

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
  grid = Array.from({ length: N }, () => Array.from({ length: N }, rnd));
  for (let guard = 0; matches().size && guard < 100; guard++) {
    matches().forEach(k => { const [r, c] = k.split(',').map(Number); grid[r][c] = rnd(); });
  }
  ctl.score(0); ctl.level(`Langkah ${moves}`);
  splash(b, 'Fruit Match', 'Tukar buah bersebelahan untuk membuat deret tiga atau lebih. Kombo beruntun memberi poin lebih besar!', () => { started = true; });
  render();
  return () => { alive = false; over = true; };
};

/* ---------- kontrol tahan (untuk game yang bergerak terus-menerus) ---------- */
function holdControls(box) {
  const held = {};
  const KEY = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' };
  box.querySelectorAll('[data-k]').forEach(btn => {
    const k = btn.dataset.k;
    btn.addEventListener('pointerdown', e => { e.preventDefault(); held[k] = true; });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, () => { held[k] = false; }));
  });
  const kd = e => { const k = KEY[e.key]; if (k) { e.preventDefault(); held[k] = true; } };
  const ku = e => { const k = KEY[e.key]; if (k) held[k] = false; };
  addEventListener('keydown', kd);
  addEventListener('keyup', ku);
  return { held, off() { removeEventListener('keydown', kd); removeEventListener('keyup', ku); } };
}

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

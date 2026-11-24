// js/games/classic.js — game klasik: Memory, Tic Tac Toe, Snake, 2048, RPS, Racing
import { R, DIR_KEYS, PAD, wireControls, splash, holdControls, RUNNERS } from './shared.js';



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


// js/games.js
// Enam mini-game. Setiap fungsi menerima (box, done) dan boleh mengembalikan fungsi cleanup.
// done(score) dipanggil sekali saat permainan selesai.

const R = n => Math.floor(Math.random() * n);
const DIR_KEYS = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' };
const PAD = `<div class="pad"><button data-k="U">▲</button><div><button data-k="L">◀</button><button data-k="D">▼</button><button data-k="R">▶</button></div></div>`;

// Tombol panah di layar (untuk HP) dan keyboard memakai handler yang sama.
function wireControls(box, onDir) {
  box.querySelectorAll('[data-k]').forEach(btn => { btn.onclick = () => onDir(btn.dataset.k); });
  const kh = e => { if (DIR_KEYS[e.key]) { e.preventDefault(); onDir(DIR_KEYS[e.key]); } };
  addEventListener('keydown', kh);
  return () => removeEventListener('keydown', kh);
}

const RUNNERS = {};

/* ---------- 1. MEMORY ---------- */
RUNNERS.memory = (b, done) => {
  const E = ['🚀', '🎮', '👾', '🏆', '💎', '⚡', '🧠', '🔥'];
  const deck = [...E, ...E].sort(() => Math.random() - 0.5);
  const t0 = Date.now();
  let open = [], matched = 0, moves = 0, lock = false;
  b.innerHTML = '<div class="info">Langkah: <span id="mv">0</span></div><div class="grid g4"></div>';
  const grid = b.querySelector('.grid');
  deck.forEach(emoji => {
    const c = document.createElement('button');
    c.className = 'card3d';
    c.textContent = '?';
    c.onclick = () => {
      if (lock || c.classList.contains('up') || c.classList.contains('ok')) return;
      c.classList.add('up');
      c.textContent = emoji;
      open.push({ c, emoji });
      if (open.length < 2) return;
      moves++;
      b.querySelector('#mv').textContent = moves;
      lock = true;
      const [a, z] = open;
      if (a.emoji === z.emoji) {
        a.c.classList.add('ok'); z.c.classList.add('ok');
        matched++; open = []; lock = false;
        if (matched === E.length) {
          const secs = (Date.now() - t0) / 1000;
          done(Math.max(100, Math.round(1200 - moves * 25 - secs * 5)));
        }
      } else {
        setTimeout(() => {
          a.c.classList.remove('up'); z.c.classList.remove('up');
          a.c.textContent = '?'; z.c.textContent = '?';
          open = []; lock = false;
        }, 700);
      }
    };
    grid.appendChild(c);
  });
};

/* ---------- 2. TIC TAC TOE (lawan AI minimax) ---------- */
RUNNERS.ttt = (b, done) => {
  let s = Array(9).fill(''), over = false;
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
      c.className = 'cell'; c.textContent = v; c.disabled = over || !!v;
      c.onclick = () => move(i);
      grid.appendChild(c);
    });
  };
  const move = i => {
    if (over || s[i]) return;
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
};

/* ---------- 3. SNAKE ---------- */
RUNNERS.snake = (b, done) => {
  b.innerHTML = `<div class="info">Skor: <span id="sc">0</span> · Panah keyboard atau tombol di bawah</div>
    <canvas id="sn" width="320" height="320"></canvas>${PAD}`;
  const cv = b.querySelector('#sn'), ctx = cv.getContext('2d'), N = 16, S = 20;
  let snake = [{ x: 8, y: 8 }], dir = { x: 1, y: 0 }, nd = dir, score = 0;
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
  const iv = setInterval(() => {
    dir = nd;
    const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || snake.some(p => p.x === h.x && p.y === h.y)) {
      clearInterval(iv); draw(); return done(score);
    }
    snake.unshift(h);
    if (h.x === food.x && h.y === food.y) {
      score += 10; b.querySelector('#sc').textContent = score; food = place();
    } else snake.pop();
    draw();
  }, 130);
  draw();
  const unwire = wireControls(b, turn);
  return () => { clearInterval(iv); unwire(); };
};

/* ---------- 4. 2048 ---------- */
RUNNERS['2048'] = (b, done) => {
  let g = Array.from({ length: 4 }, () => Array(4).fill(0)), sc = 0, over = false;
  const add = () => {
    const e = [];
    g.forEach((row, y) => row.forEach((v, x) => { if (!v) e.push([x, y]); }));
    if (e.length) { const [x, y] = e[R(e.length)]; g[y][x] = Math.random() < 0.9 ? 2 : 4; }
  };
  add(); add();
  b.innerHTML = `<div class="info">Skor: <span id="sc">0</span> · Geser dengan panah atau tombol</div><div class="g2048"></div>${PAD}`;
  const el = b.querySelector('.g2048');
  const show = () => {
    el.innerHTML = '';
    g.flat().forEach(v => {
      const d = document.createElement('div');
      d.className = 'tile'; d.textContent = v || '';
      if (v) d.style.background = `hsl(${260 - Math.log2(v) * 18},75%,${35 + Math.log2(v) * 4}%)`;
      el.appendChild(d);
    });
    b.querySelector('#sc').textContent = sc;
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
    if (over) return;
    const before = JSON.stringify(g);
    for (let i = 0; i < 4; i++) {
      const idx = [0, 1, 2, 3].map(j => k === 'L' ? [i, j] : k === 'R' ? [i, 3 - j] : k === 'U' ? [j, i] : [3 - j, i]);
      const line = slide(idx.map(([r, c]) => g[r][c]));
      idx.forEach(([r, c], j) => { g[r][c] = line[j]; });
    }
    if (JSON.stringify(g) !== before) {
      add(); show();
      if (isOver()) { over = true; done(sc); }
    }
  };
  show();
  return wireControls(b, move);
};

/* ---------- 5. ROCK PAPER SCISSORS (best of 5) ---------- */
RUNNERS.rps = (b, done) => {
  const names = ['✊ Batu', '✋ Kertas', '✌️ Gunting'], icons = ['✊', '✋', '✌️'];
  let wins = 0, losses = 0, rounds = 0;
  b.innerHTML = `<div class="info" id="st">Best of 5 · Pilih gerakanmu</div>
    <div class="rps-arena"><div id="pl">❔</div><span style="font-size:18px;color:var(--m)">VS</span><div id="ai">❔</div></div>
    <div class="row">${names.map((n, i) => `<button class="neon-btn" data-c="${i}">${n}</button>`).join('')}</div>`;
  b.querySelectorAll('[data-c]').forEach(btn => btn.onclick = () => {
    const c = +btn.dataset.c, a = R(3);
    rounds++;
    b.querySelector('#pl').textContent = icons[c];
    b.querySelector('#ai').textContent = icons[a];
    const res = (c - a + 3) % 3; // 0 seri, 1 menang, 2 kalah
    if (res === 1) wins++; else if (res === 2) losses++;
    const st = b.querySelector('#st');
    st.textContent = (res === 0 ? 'Seri!' : res === 1 ? 'Kamu menang ronde ini!' : 'AI menang ronde ini!')
      + ` (${wins}-${losses}, ronde ${rounds}/5)`;
    if (rounds === 5) {
      b.querySelectorAll('[data-c]').forEach(x => { x.disabled = true; });
      done(wins * 100);
    }
  });
};

/* ---------- 6. REACTION TEST ---------- */
RUNNERS.reaction = (b, done) => {
  let round = 0, times = [], t = 0, to = 0;
  b.innerHTML = '<button id="rz" class="react wait">Tunggu lampu hijau…</button><div class="info" id="st">5 ronde · secepat mungkin!</div>';
  const z = b.querySelector('#rz'), st = b.querySelector('#st');
  const next = () => {
    z.className = 'react wait';
    z.textContent = 'Tunggu lampu hijau…';
    to = setTimeout(() => { z.className = 'react go'; z.textContent = 'KLIK SEKARANG!'; t = performance.now(); }, 1500 + Math.random() * 2500);
  };
  const step = ms => {
    times.push(ms); round++;
    if (round === 5) {
      const avg = times.reduce((a, c) => a + c, 0) / 5;
      z.className = 'react'; z.textContent = 'Selesai!';
      done(Math.max(0, Math.round(1000 - avg)));
    } else {
      st.textContent = `Ronde ${round + 1}/5 · terakhir ${Math.round(ms)} ms`;
      next();
    }
  };
  z.onclick = () => {
    if (z.classList.contains('go')) { z.classList.remove('go'); step(performance.now() - t); }
    else if (z.classList.contains('wait') && round < 5) { clearTimeout(to); st.textContent = 'Terlalu cepat! (+1000 ms)'; step(1000); }
  };
  next();
  return () => clearTimeout(to);
};

/** Jalankan game berdasarkan key. Mengembalikan fungsi cleanup (atau null). */
export function runGame(key, box, done) {
  const fn = RUNNERS[key];
  return fn ? fn(box, done) || null : null;
}

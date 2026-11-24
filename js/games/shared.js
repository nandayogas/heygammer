// js/games/shared.js — helper dan registry runner (dipakai semua file game)
// js/games.js
// Tiga belas mini-game yang benar-benar bisa dimainkan (lihat js/data/catalog.js).
// Setiap runner menerima (box, done, ctl) dan boleh mengembalikan fungsi cleanup.
//   ctl.score(n)    → update skor di header Game Mode
//   ctl.level(v)    → update level/progres di header Game Mode
//   ctl.paused()    → true saat pemain menekan Pause (loop realtime wajib mengecek ini)
//   done(score)     → dipanggil sekali saat permainan selesai

export const R = n => Math.floor(Math.random() * n);
export const DIR_KEYS = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' };
export const PAD = `<div class="pad"><button data-k="U" aria-label="Atas">▲</button><div><button data-k="L" aria-label="Kiri">◀</button><button data-k="D" aria-label="Bawah">▼</button><button data-k="R" aria-label="Kanan">▶</button></div></div>`;

// Tombol di layar (HP) dan keyboard memakai handler yang sama.
export function wireControls(box, onDir) {
  box.querySelectorAll('[data-k]').forEach(btn => { btn.onclick = () => onDir(btn.dataset.k); });
  const kh = e => { if (DIR_KEYS[e.key]) { e.preventDefault(); onDir(DIR_KEYS[e.key]); } };
  addEventListener('keydown', kh);
  return () => removeEventListener('keydown', kh);
}

// Layar pembuka dengan tombol Start. Di belakangnya permainan sudah siap tapi belum berjalan.
export function splash(box, title, desc, start) {
  const s = document.createElement('div');
  s.className = 'splash';
  s.innerHTML = `<h3>${title}</h3><p>${desc}</p><button class="neon-btn">▶ START</button>`;
  s.querySelector('button').onclick = () => { s.remove(); start(); };
  box.appendChild(s);
}

export const RUNNERS = {};
/* ---------- kontrol tahan (untuk game yang bergerak terus-menerus) ---------- */
export function holdControls(box) {
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


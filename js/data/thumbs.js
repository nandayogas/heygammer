// js/data/thumbs.js — thumbnail animasi per game (CSS murni, tanpa gambar).
// Aktor: [emoji/teks, animasi, left%, top%, ukuran px, durasi detik, delay detik]
// Animasi: run bob spin pulse sway slide fall rise none (lihat css/thumbs.css)
// fx: lapisan latar bergerak — stars, road, grid, hills.
const T = {
  arena: [0, ['🥊', 'bob', 10, 34, 42, .8, 0], ['💥', 'pulse', 42, 16, 34, .8, .2], ['🛡️', 'bob', 70, 34, 38, .8, .4]],
  neonrush: ['road', ['🏎️', 'run', 0, 46, 42, 1.6, 0], ['🚙', 'run', 0, 58, 34, 2.3, .7], ['✨', 'pulse', 72, 14, 22, 1, 0]],
  subway: ['road', ['🏃', 'bob', 18, 40, 46, .5, 0], ['🚆', 'run', 0, 30, 44, 2.4, .4], ['🪙', 'spin', 62, 24, 22, 1.2, 0]],
  hillclimb: ['hills', ['🚙', 'sway', 34, 44, 48, 1.1, 0], ['⛰️', 'run', 0, 10, 36, 7, 0], ['🪙', 'spin', 74, 30, 22, 1.4, 0]],
  tropicalkart: ['road', ['🏎️', 'run', 0, 54, 40, 1.9, 0], ['🌴', 'run', 0, 12, 36, 5, 0], ['🏝️', 'pulse', 70, 8, 30, 2, 0]],
  kart: ['road', ['🏁', 'pulse', 70, 12, 28, 1.2, 0], ['🛻', 'run', 0, 54, 38, 1.5, 0], ['🌴', 'run', 0, 16, 30, 4, 1]],
  neonblast: ['grid', ['🟪', 'pulse', 14, 8, 24, 1.8, 0], ['🟦', 'pulse', 40, 8, 24, 1.8, .4], ['🟥', 'pulse', 66, 8, 24, 1.8, .8], ['●', 'bob', 46, 40, 16, .7, 0], ['▬▬', 'slide', 38, 78, 22, 2.4, 0]],
  memory: [0, ['🃏', 'sway', 10, 34, 34, 2.4, 0], ['🧠', 'pulse', 38, 24, 48, 2, 0], ['🃏', 'sway', 68, 34, 34, 2.4, .6]],
  racing: ['road', ['🏎️', 'run', 0, 50, 42, 1.7, 0], ['🚗', 'run', 0, 38, 32, 2.6, 1]],
  ttt: [0, ['❌', 'pulse', 14, 16, 40, 1.6, 0], ['⭕', 'pulse', 52, 40, 40, 1.6, .8], ['❌', 'pulse', 62, 8, 28, 1.6, .4]],
  snake: [0, ['🐍', 'slide', 28, 34, 52, 2, 0], ['🍎', 'bob', 74, 56, 26, 1.1, 0]],
  '2048': [0, ['2', 'pulse', 14, 30, 34, 1.8, 0], ['4', 'pulse', 40, 44, 34, 1.8, .4], ['8', 'pulse', 66, 24, 34, 1.8, .8]],
  rps: [0, ['✊', 'bob', 8, 30, 40, 1.2, 0], ['✋', 'bob', 38, 40, 40, 1.2, .3], ['✌️', 'bob', 68, 30, 40, 1.2, .6]],
  penalty: [0, ['🥅', 'none', 34, 6, 54, 1, 0], ['⚽', 'rise', 44, 100, 28, 1.7, 0]],
  basket: [0, ['🏀', 'bob', 38, 24, 44, .9, 0], ['⭐', 'spin', 74, 14, 22, 2, 0], ['⭐', 'spin', 12, 60, 18, 2.6, 0]],
  runner: ['road', ['🏃', 'bob', 18, 44, 44, .5, 0], ['🌵', 'run', 0, 56, 28, 2, 0]],
  fruit: [0, ['🍉', 'bob', 8, 30, 38, 1.1, 0], ['🍓', 'bob', 38, 40, 38, 1.1, .35], ['🍋', 'bob', 68, 28, 38, 1.1, .7]],
  shooter: ['stars', ['🚀', 'slide', 42, 62, 44, 2.6, 0], ['👾', 'bob', 20, 12, 30, 1.2, 0], ['👾', 'bob', 66, 18, 30, 1.2, .5], ['🔸', 'rise', 48, 80, 14, 1, 0]],
  zombie: [0, ['🧟', 'run', 0, 46, 44, 4.5, 0], ['🧟', 'run', 0, 56, 34, 5.5, 1.8], ['🎯', 'pulse', 72, 12, 26, 1.4, 0]],
  block: [0, ['🟦', 'fall', 12, 0, 30, 2.6, 0], ['🟪', 'fall', 44, 0, 30, 2.6, .9], ['🟨', 'fall', 72, 0, 30, 2.6, 1.7]],
};
export function thumb(g) {
  const s = T[g.id];
  if (!s) return `<b class="a t-none" style="left:36%;top:22%;font-size:58px">${g.emoji}</b>`;
  const [fx, ...actors] = s;
  return (fx ? `<i class="fx fx-${fx}"></i>` : '') + actors.map(([e, a, l, t, sz, d, dl]) =>
    `<b class="a t-${a}" style="left:${l}%;top:${t}%;font-size:${sz}px;animation-duration:${d}s;animation-delay:${dl}s">${e}</b>`).join('');
}

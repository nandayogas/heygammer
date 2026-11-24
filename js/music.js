// js/music.js — musik latar dari YouTube (embed tersembunyi, YouTube IFrame API).
// Ganti VIDEO untuk lagu lain. Browser menahan suara sebelum ada interaksi, jadi musik
// mulai setelah klik/tap pertama. Tombol #musicBtn untuk mute; jeda otomatis saat game dibuka.
const VIDEO = 'W6xf4_mCxho';
const KEY = 'hg_music';
let want = true;
try { want = localStorage.getItem(KEY) !== 'off'; } catch { /* diblokir */ }
let player = null, ready = false, started = false, ducked = false, failed = false;
const btn = document.getElementById('musicBtn');

function sync() {
  const on = want && !failed;
  btn.textContent = on ? '🔊' : '🔇';
  btn.title = failed ? 'Musik tidak bisa diputar (video tidak mengizinkan embed atau offline)' : on ? 'Matikan musik' : 'Nyalakan musik';
}
function apply() {
  sync();
  if (!ready || failed) return;
  try { (want && started && !ducked) ? player.playVideo() : player.pauseVideo(); } catch { /* player belum siap */ }
}
export function duck(on) { ducked = on; apply(); } // true saat masuk game, false saat kembali

const wrap = document.createElement('div');
wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:200px;height:200px;overflow:hidden';
wrap.innerHTML = '<div id="ytbg"></div>';
document.body.appendChild(wrap);

window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player('ytbg', {
    width: '200', height: '200', videoId: VIDEO,
    playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: VIDEO, playsinline: 1, disablekb: 1, rel: 0 },
    events: {
      onReady: () => { ready = true; player.setVolume(60); apply(); },
      onError: e => { failed = true; console.warn('Musik latar gagal, kode:', e.data); sync(); },
    },
  });
};
const s = document.createElement('script');
s.src = 'https://www.youtube.com/iframe_api';
s.onerror = () => { failed = true; sync(); };
document.head.appendChild(s);

const first = () => { started = true; apply(); };
addEventListener('pointerdown', first, { once: true });
addEventListener('keydown', first, { once: true });
btn.addEventListener('click', () => {
  want = !want; started = true;
  try { localStorage.setItem(KEY, want ? 'on' : 'off'); } catch { /* diblokir */ }
  apply();
});
sync();

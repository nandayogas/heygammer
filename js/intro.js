// js/intro.js — intro motion design: warp stars, synthwave grid + sun, kinetic title (glitch, shockwave),
// orbit ikon game, loading bar, lalu iris-wipe ke dashboard. Canvas 2D + CSS (tanpa Three.js).
// Dipanggil app.js: runIntro(canvas, onDone) → mengembalikan fungsi stop.
const WORD = 'HEYGAMMER';
const ICONS = ['🏎️', '🚀', '🧟', '⚽', '🥊', '🧱', '🏀', '👾'];
const T = { letters: .5, impact: 1.5, tag: 2.3, icons: 3.4, load: 4.2, loadEnd: 5.8, wipe: 6.1, end: 6.9 };
const SHAKES = [1.5, 2.3, 2.75, 3.2];
const RINGS = [{ t: 1.5, c: '#67e8f9' }, { t: 3.2, c: '#f0abfc' }];
const FLASH = [{ t: 1.5, a: .85 }, { t: 3.2, a: .5 }];
const ease = p => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
const TAU = Math.PI * 2;

export function runIntro(canvas, onDone) {
  const root = canvas.parentElement;
  const $ = s => root.querySelector(s);
  const title = $('#inTitle'), bar = $('#inBar'), pct = $('#inPct');
  root.classList.remove('go', 'glitch', 'tag', 'load', 'wipe', 'shake', 'static');
  title.innerHTML = [...WORD].map((c, i) => `<span class="${i > 2 ? 'g' : ''}" style="--i:${i}">${c}</span>`).join('');
  bar.style.width = '0'; pct.textContent = '0%';

  if (document.body.classList.contains('reduce')) { // reduced motion: statis 1,6 detik
    root.classList.add('go', 'tag', 'load', 'static');
    bar.style.width = '100%'; pct.textContent = 'READY';
    const id = setTimeout(onDone, 1600);
    return () => clearTimeout(id);
  }

  const ctx = canvas.getContext('2d');
  const stars = Array.from({ length: 150 }, () => ({ a: Math.random() * TAU, r: Math.random() * .8 + .02, s: .5 + Math.random() }));
  const fired = new Set();
  let W = 0, H = 0, raf = 0, t0 = 0, last = 0, gridOff = 0;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize);
  resize();

  function draw(t, dt) {
    const hor = H * .6, cx = W / 2, cy = H * .42, maxR = Math.hypot(W, H) / 2;
    let g = ctx.createLinearGradient(0, 0, 0, hor);
    g.addColorStop(0, '#04020d'); g.addColorStop(1, '#2a0a52');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hor);

    // bintang warp: cepat sampai impact, lalu melambat
    const warp = t < T.impact ? 2.4 : 2.4 - 1.9 * ease((t - T.impact) / 1.2);
    ctx.lineCap = 'round';
    for (const s of stars) {
      s.r += warp * s.s * (.15 + s.r) * dt;
      if (s.r > 1) { s.r = .02; s.a = Math.random() * TAU; }
      const tail = Math.max(0, s.r - warp * .04 * s.s * (.15 + s.r)), c = Math.cos(s.a), n = Math.sin(s.a);
      const y1 = H * .4 + n * maxR * s.r;
      if (y1 > hor) continue;
      ctx.strokeStyle = `rgba(200,220,255,${Math.min(1, s.r * 1.6) * .9})`;
      ctx.lineWidth = .6 + s.r * 1.8;
      ctx.beginPath(); ctx.moveTo(cx + c * maxR * tail, H * .4 + n * maxR * tail); ctx.lineTo(cx + c * maxR * s.r, y1); ctx.stroke();
    }

    // matahari synthwave
    if (t > .4) {
      const r = Math.min(W, H) * .2 * ease((t - .4) / 1.1), sy = hor - r * .55;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hor); ctx.clip();
      g = ctx.createLinearGradient(0, sy - r, 0, hor);
      g.addColorStop(0, '#fde047'); g.addColorStop(.55, '#fb7185'); g.addColorStop(1, '#c026d3');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, sy, r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a0a52';
      for (let k = 1; k <= 4; k++) ctx.fillRect(cx - r, sy + k * r * .12, r * 2, 1 + k * r * .012);
      ctx.restore();
    }
    g = ctx.createLinearGradient(0, hor - 40, 0, hor + 10);
    g.addColorStop(0, 'rgba(244,114,182,0)'); g.addColorStop(.8, 'rgba(244,114,182,.5)'); g.addColorStop(1, 'rgba(244,114,182,0)');
    ctx.fillStyle = g; ctx.fillRect(0, hor - 40, W, 50);

    // lantai grid perspektif
    g = ctx.createLinearGradient(0, hor, 0, H);
    g.addColorStop(0, '#12022b'); g.addColorStop(1, '#05010f');
    ctx.fillStyle = g; ctx.fillRect(0, hor, W, H - hor);
    const a = Math.min(1, t / .6);
    gridOff = (gridOff + (t < T.impact ? 1.6 : .5) * dt) % 1;
    for (let i = 0; i < 14; i++) {
      const z = (i + gridOff) / 14, y = hor + (H - hor) * z * z;
      ctx.strokeStyle = `rgba(217,70,239,${a * (.15 + z * .85)})`; ctx.lineWidth = 1 + z * 2;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.strokeStyle = `rgba(34,211,238,${a * .45})`; ctx.lineWidth = 1.2;
    for (let k = -14; k <= 14; k++) {
      ctx.beginPath(); ctx.moveTo(cx + k * W * .012, hor); ctx.lineTo(cx + k * W * .14, H); ctx.stroke();
    }

    // gelombang kejut
    for (const r of RINGS) {
      const p = (t - r.t) / 1.1;
      if (p < 0 || p > 1) continue;
      ctx.globalAlpha = 1 - p; ctx.strokeStyle = r.c; ctx.lineWidth = 2 + 8 * (1 - p);
      ctx.beginPath(); ctx.arc(cx, cy, ease(p) * maxR * 1.1, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ikon game mengorbit judul
    if (t > T.icons) {
      const base = Math.max(26, Math.min(54, W * .06)), rx = Math.min(W * .42, 520), ry = H * .2;
      const items = ICONS.map((e, i) => { const ang = i / ICONS.length * TAU + t * .9; return { e, i, ang, d: Math.sin(ang) }; }).sort((p, q) => p.d - q.d);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const o of items) {
        const p = ease((t - T.icons - o.i * .08) / .5);
        if (p <= 0) continue;
        const depth = (o.d + 1) / 2;
        ctx.globalAlpha = (.45 + .55 * depth) * p;
        ctx.font = `${Math.max(1, base * (.7 + .3 * depth) * p)}px serif`;
        ctx.fillText(o.e, cx + Math.cos(o.ang) * rx, cy + o.d * ry);
      }
      ctx.globalAlpha = 1;
    }

    // kilatan layar
    for (const f of FLASH) {
      const p = (t - f.t) / .4;
      if (p < 0 || p >= 1) continue;
      ctx.fillStyle = `rgba(255,255,255,${f.a * (1 - p)})`; ctx.fillRect(0, 0, W, H);
    }
  }

  function steps(t) {
    if (t >= T.letters) root.classList.add('go');
    if (t >= T.impact && t < T.impact + .6) root.classList.add('glitch');
    else if (t >= T.impact + .6) root.classList.remove('glitch');
    if (t >= T.tag) root.classList.add('tag');
    if (t >= T.load) {
      root.classList.add('load');
      const p = Math.min(1, (t - T.load) / (T.loadEnd - T.load)), v = Math.floor(p * p * (3 - 2 * p) * 100);
      bar.style.width = v + '%';
      pct.textContent = v >= 100 ? 'READY' : `LOADING UNIVERSE ${v}%`;
    }
    for (const s of SHAKES) if (t >= s && !fired.has(s)) {
      fired.add(s); root.classList.remove('shake'); void root.offsetWidth; root.classList.add('shake');
    }
    if (t >= T.wipe) root.classList.add('wipe');
  }

  function frame(now) {
    if (!t0) { t0 = now; last = now; }
    const t = (now - t0) / 1000, dt = Math.min(.05, (now - last) / 1000);
    last = now;
    draw(t, dt); steps(t);
    if (t >= T.end) { raf = 0; onDone(); return; }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
}

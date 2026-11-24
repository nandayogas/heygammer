// js/three-scene.js
// Semua animasi 3D: intro sinematik (runIntro) dan latar hero (startHero).
import * as THREE from 'three';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = innerWidth < 768;
const PURPLE = 0xa855f7, CYAN = 0x22d3ee, GOLD = 0xfbbf24, BLUE = 0x3b82f6;

function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  return r;
}

// Menyesuaikan ukuran canvas dengan kontainernya.
function fitTo(r, cam, el) {
  const fit = () => {
    const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
    r.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  };
  fit();
  addEventListener('resize', fit);
  return () => removeEventListener('resize', fit);
}

const glowMat = c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.4 });

// Objek gaming 3D sederhana (controller, joystick, mobil, puzzle, piala).
export function makeProp(kind) {
  const g = new THREE.Group();
  if (kind === 'controller') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.1), glowMat(0x7c3aed));
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), glowMat(CYAN));
    l.position.set(-0.6, -0.25, 0.4);
    const r = l.clone(); r.position.x = 0.6;
    g.add(body, l, r);
  } else if (kind === 'joystick') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.2, 24), glowMat(0x1e1b4b));
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 12), glowMat(PURPLE));
    stick.position.y = 0.7;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), glowMat(0xf472b6));
    ball.position.y = 1.35;
    g.add(base, stick, ball);
  } else if (kind === 'car') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 1), glowMat(0xef4444));
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1, 0.4, 0.8), glowMat(0x1e1b4b));
    cab.position.set(-0.2, 0.45, 0);
    g.add(body, cab);
    for (const x of [-0.7, 0.7]) for (const z of [-0.55, 0.55]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 16), glowMat(0x111827));
      w.rotation.x = Math.PI / 2; w.position.set(x, -0.3, z); g.add(w);
    }
  } else if (kind === 'puzzle') {
    [[0, 0, 0, 0x7c3aed], [1, 0, 0, 0x3b82f6], [0, 1, 0, 0x22d3ee]].forEach(([x, y, z, c]) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), glowMat(c));
      b.position.set(x, y, z); g.add(b);
    });
  } else if (kind === 'trophy') {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.3, 0.9, 24), glowMat(GOLD));
    cup.position.y = 0.8;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 12), glowMat(GOLD));
    stem.position.y = 0.1;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.9), glowMat(0x92400e));
    base.position.y = -0.3;
    g.add(cup, stem, base);
  }
  return g;
}

function starfield(n, spread) {
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(n * 3);
  for (let i = 0; i < p.length; i++) p[i] = (Math.random() - 0.5) * spread;
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xc4b5fd, size: 0.25, transparent: true, opacity: 0.85, depthWrite: false }));
}

// Tekstur logo HEYGAMMER dari canvas (tanpa perlu memuat font 3D).
function logoTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const x = c.getContext('2d');
  x.font = '900 150px system-ui, Arial';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = '#a855f7'; x.shadowBlur = 40;
  x.fillStyle = '#ffffff';
  x.fillText('HEYGAMMER', 512, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const ease = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * Intro sinematik ±7 detik:
 * portal terbuka → kamera mengorbit 360° → logo berputar keluar dari portal
 * → objek gaming mengorbit → kamera mendekat → selesai.
 * Mengembalikan fungsi stop() untuk tombol SKIP.
 */
export function runIntro(canvas, onDone) {
  if (reduce) {
    const t = setTimeout(onDone, 300);
    return () => clearTimeout(t);
  }

  const r = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
  const unfit = fitTo(r, cam, canvas.parentElement);

  scene.add(starfield(mobile ? 700 : 1500, 200), new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.PointLight(PURPLE, 40, 60);
  key.position.set(0, 0, 6);
  scene.add(key);

  const portal = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4, 0.3, 16, 120), new THREE.MeshBasicMaterial({ color: PURPLE }));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.7, 64), new THREE.MeshBasicMaterial({
    color: BLUE, transparent: true, opacity: 0.35, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  portal.add(ring, disc);
  portal.scale.setScalar(0.001);
  scene.add(portal);

  const logo = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({
    map: logoTexture(), transparent: true, depthWrite: false,
  }));
  logo.visible = false;
  scene.add(logo);

  const props = ['controller', 'joystick', 'car', 'puzzle', 'trophy'].map((k, i) => {
    const p = makeProp(k);
    p.userData.a = (i / 5) * Math.PI * 2;
    p.scale.setScalar(0.001);
    scene.add(p);
    return p;
  });

  const clock = new THREE.Clock();
  const DUR = 7;
  let raf = 0, finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    unfit();
    r.dispose();
    onDone();
  };

  const frame = () => {
    const t = clock.getElapsedTime();

    // 1. Portal terbuka (0.4–1.8 dtk) dan berdenyut
    portal.scale.setScalar(Math.max(0.001, ease((t - 0.4) / 1.4)));
    ring.rotation.z += 0.01;

    // 2. Kamera mengorbit 360° (0–5 dtk), lalu mendekat ke logo (4.5–6.5 dtk)
    const orbit = ease(t / 5) * Math.PI * 2;
    const R = t < 4.5 ? 18 - ease((t - 3) / 2) * 4 : 14 - ease((t - 4.5) / 2) * 8;
    cam.position.set(Math.sin(orbit) * R, 2 + Math.sin(t) * 0.5, Math.cos(orbit) * R);
    cam.lookAt(0, 0, 0);

    // 3. Logo muncul dari portal dan berputar 360° pada sumbu vertikal (2–4.5 dtk)
    logo.visible = t > 2;
    logo.scale.setScalar(Math.max(0.001, ease((t - 2) / 1.5)));
    logo.rotation.y = ease((t - 2) / 2.5) * Math.PI * 2;

    // 4. Objek gaming muncul dan mengorbit logo (2.5 dtk dst)
    props.forEach((p, i) => {
      p.scale.setScalar(Math.max(0.001, ease((t - 2.5 - i * 0.2) / 1)));
      const a = p.userData.a + t * 0.6;
      p.position.set(Math.cos(a) * 6.5, Math.sin(a * 2) * 1.2, Math.sin(a) * 6.5);
      p.rotation.y += 0.02;
      p.rotation.x = Math.sin(t + i) * 0.2;
    });

    key.intensity = 40 + Math.sin(t * 3) * 8;
    r.render(scene, cam);

    if (t >= DUR) return finish();
    raf = requestAnimationFrame(frame);
  };

  raf = requestAnimationFrame(frame);
  return () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    unfit();
    r.dispose();
  };
}

/**
 * Latar 3D untuk hero: planet berputar, cincin cyan, dan objek gaming melayang.
 * Kamera bergerak sedikit mengikuti mouse (parallax).
 */
export function startHero(container) {
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const r = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  cam.position.set(0, 0, 12);
  const unfit = fitTo(r, cam, container);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5), starfield(mobile ? 400 : 900, 80));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(5, 5, 5);
  scene.add(sun);

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(4, 48, 32),
    new THREE.MeshStandardMaterial({ color: 0x1e3a8a, emissive: 0x1e40af, emissiveIntensity: 0.35, roughness: 0.8 })
  );
  planet.position.set(5, 1.5, -6);
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(4.25, 48, 32),
    new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  atmo.position.copy(planet.position);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.06, 8, 140), new THREE.MeshBasicMaterial({ color: CYAN }));
  ring.position.copy(planet.position);
  ring.rotation.x = Math.PI / 2.6;
  scene.add(planet, atmo, ring);

  const props = ['controller', 'car', 'trophy', 'puzzle'].map((k, i) => {
    const p = makeProp(k);
    p.scale.setScalar(0.85);
    p.userData = { base: new THREE.Vector3(6 + (i % 2) * 2.5, (i - 1.5) * 1.5, 1), ph: i };
    scene.add(p);
    return p;
  });

  const pointer = { x: 0, y: 0 };
  addEventListener('pointermove', e => {
    pointer.x = e.clientX / innerWidth - 0.5;
    pointer.y = e.clientY / innerHeight - 0.5;
  });

  const clock = new THREE.Clock();
  let raf = 0;
  const loop = () => {
    const t = clock.getElapsedTime();
    planet.rotation.y = t * 0.08;
    ring.rotation.z = t * 0.05;
    props.forEach((p, i) => {
      const b = p.userData.base;
      p.position.set(b.x + Math.sin(t * 0.7 + i) * 0.3, b.y + Math.sin(t + i * 1.7) * 0.4, b.z + Math.cos(t * 0.5 + i) * 0.4);
      p.rotation.y = t * 0.6 + i;
    });
    cam.position.x += (pointer.x * 1.2 - cam.position.x) * 0.05;
    cam.position.y += (-pointer.y * 0.8 - cam.position.y) * 0.05;
    cam.lookAt(1, 0, 0);
    r.render(scene, cam);
    raf = requestAnimationFrame(loop);
  };

  if (reduce) r.render(scene, cam);
  else loop();

  return () => {
    cancelAnimationFrame(raf);
    unfit();
    r.dispose();
    canvas.remove();
  };
}

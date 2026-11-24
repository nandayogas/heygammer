// js/three-scene.js
// Objek 3D bersama dan latar hero (startHero). Intro ada di js/intro.js.
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

export function starfield(n, spread) {
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(n * 3);
  for (let i = 0; i < p.length; i++) p[i] = (Math.random() - 0.5) * spread;
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xc4b5fd, size: 0.25, transparent: true, opacity: 0.85, depthWrite: false }));
}

// Tekstur logo HEYGAMMER dari canvas (tanpa perlu memuat font 3D).
export function logoTexture() {
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

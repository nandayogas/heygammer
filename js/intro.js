// js/intro.js
// Intro sinematik 3D (±7 detik):
// portal neon terbuka → logo 3D keluar dari portal → objek gaming mengorbit
// → kamera mendorong masuk → ledakan partikel → tagline → selesai.
// Mengembalikan fungsi stop() untuk tombol SKIP.
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { makeProp, starfield, logoTexture } from './three-scene.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = innerWidth < 768;
const PURPLE = 0xa855f7, CYAN = 0x22d3ee, GOLD = 0xfbbf24, BLUE = 0x3b82f6, PINK = 0xf472b6;
const FONT_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json';
const DUR = 7.2;     // total durasi (detik)
const BURST = 5.4;   // saat ledakan partikel

const clamp01 = t => Math.min(1, Math.max(0, t));
const ease = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
const easeOutBack = t => {
  t = clamp01(t);
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.15;
  return r;
}

// Menyesuaikan ukuran canvas dengan kontainer. Di layar tegak, FOV dilebarkan
// supaya logo tidak terpotong.
function fit(r, cam, el) {
  const resize = () => {
    const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
    r.setSize(w, h, false);
    cam.aspect = w / h;
    cam.fov = w < h ? 75 : 55;
    cam.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);
  return () => removeEventListener('resize', resize);
}

// Sprite cahaya lembut (additive). Tekstur dipakai bersama antar-pemutaran.
let glowTex = null;
function glowSprite(color, size, opacity = 1) {
  if (!glowTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    glowTex = new THREE.CanvasTexture(c);
    glowTex.colorSpace = THREE.SRGBColorSpace;
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  s.scale.setScalar(size);
  return s;
}

function neonRing(radius, tube, color, opacity) {
  return new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 16, 160),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })
  );
}

export function runIntro(canvas, onDone) {
  const tag = canvas.parentElement.querySelector('.intro-tag');

  // Mode reduced motion: langsung selesai.
  if (reduce) {
    const t = setTimeout(onDone, 300);
    return () => clearTimeout(t);
  }

  // Tanpa WebGL, lewati intro dan jangan biarkan overlay hitam menutupi situs.
  let r;
  try {
    r = makeRenderer(canvas);
  } catch (err) {
    console.warn('Intro 3D tidak bisa dijalankan:', err);
    const t = setTimeout(onDone, 0);
    return () => clearTimeout(t);
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05040f, 0.025);
  const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  const unfit = fit(r, cam, canvas.parentElement);

  let raf = 0, finished = false;

  /* ---------- cahaya & latar ---------- */
  scene.add(starfield(mobile ? 700 : 1500, 200), new THREE.AmbientLight(0xffffff, 0.35));
  const lights = [
    new THREE.PointLight(PURPLE, 60, 60),
    new THREE.PointLight(CYAN, 40, 60),
    new THREE.PointLight(GOLD, 30, 60),
  ];
  lights[0].position.set(0, 0, 8);
  lights[1].position.set(-8, 4, 4);
  lights[2].position.set(8, -4, 4);
  scene.add(...lights);

  /* ---------- portal ---------- */
  const portal = new THREE.Group();
  const rings = [neonRing(4.2, 0.12, PURPLE, 0.9), neonRing(4.9, 0.05, CYAN, 0.7), neonRing(5.6, 0.03, BLUE, 0.5)];
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(4, 64),
    new THREE.MeshBasicMaterial({ color: 0x1e1b4b, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
  );
  disc.position.z = -0.05;
  const halo = glowSprite(PURPLE, 18, 0.6);
  portal.add(disc, ...rings, halo);
  portal.position.z = -1;
  scene.add(portal);

  /* ---------- logo ---------- */
  // Mulai dengan logo datar (tekstur canvas), lalu diganti logo 3D begitu font selesai dimuat.
  const logo = new THREE.Group();
  logo.position.y = -4;
  logo.visible = false;
  const fallback = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 2),
    new THREE.MeshBasicMaterial({ map: logoTexture(), transparent: true, depthWrite: false })
  );
  const logoGlow = glowSprite(PURPLE, 15, 0.45);
  logoGlow.position.z = -1.2;
  logo.add(fallback, logoGlow);
  scene.add(logo);

  let logoMat = null;
  new FontLoader().load(
    FONT_URL,
    font => {
      if (finished) return;
      const geo = new TextGeometry('HEYGAMMER', {
        font, size: 1, depth: 0.45, curveSegments: 8,
        bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 4,
      });
      geo.center();
      geo.computeBoundingBox();
      const width = geo.boundingBox.max.x - geo.boundingBox.min.x;
      logoMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0.4, roughness: 0.2,
        clearcoat: 1, clearcoatRoughness: 0.1,
        emissive: PURPLE, emissiveIntensity: 0.25,
      });
      const mesh = new THREE.Mesh(geo, logoMat);
      mesh.scale.setScalar(8 / width);
      logo.remove(fallback);
      fallback.geometry.dispose();
      fallback.material.map.dispose();
      fallback.material.dispose();
      logo.add(mesh);
    },
    undefined,
    err => console.warn('Font intro gagal dimuat, memakai logo datar.', err)
  );

  /* ---------- objek gaming mengorbit ---------- */
  const glowColors = [CYAN, PINK, GOLD, PURPLE, GOLD];
  const props = ['controller', 'joystick', 'car', 'puzzle', 'trophy'].map((k, i) => {
    const holder = new THREE.Group();
    holder.add(makeProp(k), glowSprite(glowColors[i], 3.2, 0.5));
    holder.userData.a = (i / 5) * Math.PI * 2;
    holder.scale.setScalar(0.001);
    scene.add(holder);
    return holder;
  });

  /* ---------- ledakan partikel ---------- */
  const N = mobile ? 180 : 360;
  const pPos = new Float32Array(N * 3);
  const pVel = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const s = 2 + Math.random() * 6;
    pVel[i * 3] = Math.sin(ph) * Math.cos(th) * s;
    pVel[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * s;
    pVel[i * 3 + 2] = Math.cos(ph) * s;
  }
  const pGeo = new THREE.BufferGeometry();
  const pAttr = new THREE.BufferAttribute(pPos, 3);
  pGeo.setAttribute('position', pAttr);
  const burst = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: CYAN, size: 0.22, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(burst);

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();

  const dispose = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    unfit();
    scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
          if (m.map && m.map !== glowTex) m.map.dispose();
          m.dispose();
        });
      }
    });
    r.dispose();
    r.forceContextLoss(); // lepas context WebGL supaya tidak menumpuk saat Replay
    if (tag) tag.style.opacity = '0';
  };

  const frame = () => {
    const t = clock.getElapsedTime();

    // 1. Portal membuka dengan efek memantul dan berputar pelan
    portal.scale.setScalar(Math.max(0.001, easeOutBack(t / 1.2)));
    rings.forEach((m, i) => {
      m.rotation.x = Math.sin(t * 0.5 + i) * 0.5;
      m.rotation.y = t * (0.4 + i * 0.25);
    });
    halo.material.opacity = 0.55 + Math.sin(t * 2) * 0.1;

    // 2. Logo naik keluar dari portal lalu berputar sampai pas menghadap kamera
    logo.visible = t > 1.2;
    const rise = easeOutBack((t - 1.2) / 1.2);
    logo.position.y = THREE.MathUtils.lerp(-4, 0, rise);
    logo.scale.setScalar(Math.max(0.001, rise));
    logo.rotation.y = -(1 - ease((t - 1.2) / 1.8)) * Math.PI * 2;
    logoGlow.material.opacity = 0.4 + Math.sin(t * 2.2) * 0.08;
    if (logoMat) {
      logoMat.emissiveIntensity = 0.25 + Math.sin(t * 3) * 0.08 + (t > BURST ? 0.3 * (1 - clamp01((t - BURST) / 1.2)) : 0);
    }

    // 3. Objek gaming muncul satu per satu dan mengorbit logo
    props.forEach((h, i) => {
      h.scale.setScalar(Math.max(0.001, easeOutBack((t - 2.6 - i * 0.15) / 0.9)));
      const a = h.userData.a + t * 0.5;
      h.position.set(Math.cos(a) * 6.2, Math.sin(a * 2) * 1.1, Math.sin(a) * 6.2);
      h.rotation.y = t * 0.8 + i;
    });

    // 4. Kamera mengorbit ±290°, lalu mendorong masuk ke logo
    const orbit = ease(t / 5.2) * Math.PI * 2 * 0.9;
    const dist = t < 5.2 ? 17 - ease((t - 2) / 3) * 3 : 14 - ease((t - 5.2) / 1.2) * 5;
    cam.position.set(Math.sin(orbit) * dist, 1.8 + Math.sin(t * 0.7) * 0.4, Math.cos(orbit) * dist);
    cam.lookAt(0, 0, 0);

    // 5. Ledakan partikel dari logo
    if (t >= BURST) {
      const k = clamp01((t - BURST) / 1.6);
      for (let i = 0; i < N * 3; i++) pPos[i] = pVel[i] * k;
      pAttr.needsUpdate = true;
      burst.material.opacity = 1 - k;
    }

    // 6. Tagline muncul lalu hilang
    if (tag) tag.style.opacity = String(ease((t - 3.4) / 0.7) * (1 - ease((t - 6.2) / 0.6)));

    lights[0].intensity = 60 + Math.sin(t * 3) * 10;
    r.render(scene, cam);

    if (t >= DUR) {
      dispose();
      onDone();
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  raf = requestAnimationFrame(frame);
  return dispose;
}

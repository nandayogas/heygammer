// js/intro.js — EPIC 3D UNIVERSE CINEMATIC (Three.js, semua procedural, ±7,6 detik).
// Bintang warp → galaksi spiral → nebula → black hole (lensing) → planet → logo 3D metalik → zoom-out → homepage.
// Pipeline: bloom + pass kustom (gravitational lensing, chromatic aberration kecepatan, vignette).
// Android: kualitas dikurangi otomatis (jumlah partikel, pixel ratio, bloom) dan turun lagi bila FPS rendah.
import * as THREE from 'three';
import { logoTexture } from './three-scene.js';

const FONT_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json';
const DUR = 7.6, TP = 5.4; // durasi total, durasi kamera menyusuri jalur
const CAPS = [[.9, 2.6, 'ENTER THE UNIVERSE'], [2.9, 4.4, 'WHERE GAMES ARE BORN'], [6.0, 7.6, 'PLAY · EXPLORE · DOMINATE']];
const V3 = (...a) => new THREE.Vector3(...a);
const LOGO = V3(0, 12, -2010), PLANET = V3(-300, -110, -2300), BH = V3(380, 90, -1150), LIGHT = V3(1, .35, .5).normalize();
const CAM = new THREE.CatmullRomCurve3([V3(0, 0, 300), V3(0, 8, 60), V3(-10, 22, -380), V3(18, 14, -850), V3(-10, -4, -1250), V3(150, 6, -1600), V3(55, 12, -1790), V3(0, 12, -1900)], false, 'centripetal');
const LOOK = new THREE.CatmullRomCurve3([V3(0, 0, -400), V3(0, 0, -700), V3(0, -5, -950), V3(-40, -10, -1500), V3(-250, -100, -2250), V3(-120, -50, -2150), V3(-30, 5, -2020), V3(0, 12, -2010)], false, 'centripetal');
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const outBack = x => { x = clamp(x); return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };
const rnd = (a, b) => a + Math.random() * (b - a);
const ADD = THREE.AdditiveBlending;

/* ---------- tekstur procedural ---------- */
function blobTex() { // awan nebula
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), pal = ['80,120,255', '168,85, 247', '34,211,238', '236,72,153'];
  for (let i = 0; i < 46; i++) {
    const x = rnd(40, 216), y = rnd(40, 216), r = rnd(30, 90), col = pal[(Math.random() * 3.3) | 0];
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${col},.22)`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(128, 128, 30, 128, 128, 128);
  m.addColorStop(0, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------- partikel bintang & galaksi (satu shader, satu draw call per set) ---------- */
function pointsMat(k, al) {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uPx: { value: 1 }, uK: { value: k }, uAl: { value: al } },
    vertexShader: `attribute vec3 aCol;attribute float aSize,aPh;uniform float uT,uPx,uK;varying vec3 vC;varying float vA;
      void main(){vec4 mv=modelViewMatrix*vec4(position,1.);float d=max(-mv.z,1.);
      gl_PointSize=clamp(aSize*uK*uPx*420./d,1.,26.*uPx);
      vA=(.7+.3*sin(uT*2.+aPh))*smoothstep(10.,70.,d);vC=aCol;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uAl;varying vec3 vC;varying float vA;
      void main(){float a=smoothstep(.5,0.,length(gl_PointCoord-.5));a*=a;gl_FragColor=vec4(vC*(1.+a*1.6),a*vA*uAl);}`,
    transparent: true, depthWrite: false, blending: ADD,
  });
}
function points(n, gen, mat) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), sz = new Float32Array(n), ph = new Float32Array(n);
  const o = { col: new THREE.Color() };
  for (let i = 0; i < n; i++) {
    gen(i, o);
    pos[i * 3] = o.x; pos[i * 3 + 1] = o.y; pos[i * 3 + 2] = o.z;
    col[i * 3] = o.col.r; col[i * 3 + 1] = o.col.g; col[i * 3 + 2] = o.col.b;
    sz[i] = o.s; ph[i] = Math.random() * 6.283;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  const p = new THREE.Points(g, mat); p.frustumCulled = false; return p;
}
const starCol = c => Math.random() < .7 ? c.setHSL(rnd(.55, .68), rnd(.3, .8), rnd(.75, .95)) : c.setHSL(rnd(.05, .12), rnd(.3, .8), rnd(.75, .95));
const C1 = new THREE.Color('#ffd9a0'), C2 = new THREE.Color('#8b5cf6'), C3 = new THREE.Color('#22d3ee');

/* ---------- planet (shader fbm + atmosfer fresnel) ---------- */
const NOISE = `float h(vec3 p){p=fract(p*.3183+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<OCT;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}`;
const PVERT = `varying vec3 vP,vN,vW;void main(){vP=position;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
function makePlanet(R, oct) {
  const g = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uL: { value: LIGHT.clone() }, uT: { value: 0 } }, vertexShader: PVERT,
    fragmentShader: `#define OCT ${oct}
uniform vec3 uL;uniform float uT;varying vec3 vP,vN,vW;${NOISE}
void main(){vec3 p=normalize(vP);float land=fbm(p*2.4+3.),cl=fbm(p*4.+vec3(uT*.03,0.,0.)+9.);
vec3 oc=mix(vec3(.02,.08,.32),vec3(.05,.35,.75),smoothstep(.3,.6,land));
vec3 ld=mix(vec3(.12,.45,.35),vec3(.55,.35,.75),fbm(p*6.));
vec3 base=mix(oc,ld,smoothstep(.52,.58,land));base=mix(base,vec3(.95,.97,1.),smoothstep(.55,.8,cl)*.85);
vec3 N=normalize(vN);float d=dot(N,normalize(uL));float lit=smoothstep(-.1,.6,d);
vec3 V=normalize(cameraPosition-vW);float fr=pow(1.-max(dot(N,V),0.),3.);
vec3 col=base*(.04+lit*1.25)+vec3(.2,.55,1.)*fr*(.25+lit*.9);
col+=vec3(1.,.7,.3)*step(.58,land)*smoothstep(.1,-.3,d)*.22;gl_FragColor=vec4(col,1.);}`,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), mat);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.1, 48, 32), new THREE.ShaderMaterial({
    uniforms: { uL: { value: LIGHT.clone() } }, vertexShader: PVERT, side: THREE.BackSide, transparent: true, depthWrite: false, blending: ADD,
    fragmentShader: `uniform vec3 uL;varying vec3 vP,vN,vW;void main(){vec3 N=normalize(vN),V=normalize(cameraPosition-vW);
float i=pow(clamp(1.+dot(N,V),0.,1.),3.);gl_FragColor=vec4(vec3(.25,.6,1.)*i*1.7*(.3+smoothstep(-.3,.5,dot(N,normalize(uL)))),i);}`,
  }));
  g.add(body, atmo); g.position.copy(PLANET);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(24, 24, 16), new THREE.MeshStandardMaterial({ color: 0x9a9fb0, roughness: .95, envMapIntensity: .15 }));
  moon.position.set(340, 170, 80); g.add(moon);
  return { g, mat, body };
}

/* ---------- black hole: horizon hitam + cakram akresi bergolak (lensing ada di pass layar) ---------- */
function makeBH() {
  const g = new THREE.Group();
  const diskMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 } }, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: ADD,
    vertexShader: `varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float uT;varying vec2 vP;void main(){float r=length(vP),t=clamp((r-32.)/73.,0.,1.),a=atan(vP.y,vP.x);
float s=.5+.5*sin(a*3.+log(r)*9.-uT*2.5);vec3 c=mix(vec3(1.,.95,.8),vec3(1.,.45,.1),t);c=mix(c,vec3(.2,.7,1.),smoothstep(.6,1.,t));
gl_FragColor=vec4(c*1.7,(1.-t)*(.35+.65*s)*smoothstep(0.,.08,t));}`,
  });
  const disk = new THREE.Mesh(new THREE.RingGeometry(32, 105, 96, 1), diskMat); disk.rotation.x = -1.1;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(27, 1.1, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffe2b0 })); ring.rotation.x = -1.1;
  g.add(new THREE.Mesh(new THREE.SphereGeometry(24, 32, 16), new THREE.MeshBasicMaterial({ color: 0x000000 })), disk, ring);
  g.position.copy(BH); g.scale.setScalar(1.2);
  return { g, diskMat };
}

const LENS = {
  uniforms: { tDiffuse: { value: null }, uC: { value: new THREE.Vector2(.5, .5) }, uS: { value: 0 }, uA: { value: 1 }, uCA: { value: .01 }, uVig: { value: .9 } },
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `uniform sampler2D tDiffuse;uniform vec2 uC;uniform float uS,uA,uCA,uVig;varying vec2 vUv;
void main(){vec2 d=vUv-uC;float r=length(vec2(d.x*uA,d.y));float k=clamp(uS/(r*r*40.+.35),0.,.9);vec2 uv=vUv-d*k;
vec2 dir=vUv-.5;float ca=uCA*dot(dir,dir);
vec3 col=vec3(texture2D(tDiffuse,uv+dir*ca).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-dir*ca).b);
col*=mix(1.,smoothstep(.95,.25,length(dir*vec2(uA*.8,1.))),uVig);gl_FragColor=vec4(col,1.);}`,
};

export function runIntro(canvas, onDone) {
  const root = canvas.parentElement, cap = root.querySelector('#inCap');
  root.classList.remove('wipe', 'fb'); cap.className = 'in-cap'; cap.textContent = '';
  let stopped = false, raf = 0, timer = 0, cleanup = () => {};
  const stop = () => { stopped = true; cancelAnimationFrame(raf); clearTimeout(timer); cleanup(); };
  const fallback = () => { cap.className = 'in-cap'; cap.textContent = ''; root.classList.add('fb'); timer = setTimeout(onDone, 1600); };
  if (document.body.classList.contains('reduce')) { fallback(); return stop; }
  start().catch(e => { console.warn('Intro 3D gagal, memakai logo statis.', e); if (!stopped) { cleanup(); fallback(); } });
  return stop;

  async function start() {
    cap.textContent = 'LOADING UNIVERSE'; cap.classList.add('ld');
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || Math.min(innerWidth, innerHeight) < 600 || (navigator.hardwareConcurrency || 8) <= 4;
    const q = !mobile;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    const imp = p => import('three/addons/' + p).catch(() => null);
    const [EC, RP, BP, SP, OP, RE, FL, TG] = await Promise.all(['postprocessing/EffectComposer.js', 'postprocessing/RenderPass.js', 'postprocessing/UnrealBloomPass.js', 'postprocessing/ShaderPass.js', 'postprocessing/OutputPass.js', 'environments/RoomEnvironment.js', 'loaders/FontLoader.js', 'geometries/TextGeometry.js'].map(imp));
    let font = null;
    if (FL && TG) {
      try {
        const j = await Promise.race([fetch(FONT_URL).then(r => r.json()), new Promise((_, no) => setTimeout(no, 6000))]);
        font = new FL.FontLoader().parse(j);
      } catch { /* pakai logo datar */ }
    }
    if (stopped) { renderer.dispose(); return; }

    let W = innerWidth, H = innerHeight, pr = q ? Math.min(devicePixelRatio || 1, 1.75) : 1;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, W / H, 1, 8000);
    const mats = [], tex = [];
    const mk = (n, gen, mat) => { mats.push(mat); const p = points(n, gen, mat); scene.add(p); return p; };

    // lingkungan untuk pantulan logo metalik
    let pm = null;
    if (RE) { pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RE.RoomEnvironment(), .04).texture; }

    // bintang: terowongan di sepanjang jalur kamera + kubah langit jauh
    mk(q ? 26000 : 10000, (i, o) => { const a = rnd(0, 6.283), r = 20 + Math.pow(Math.random(), .7) * 900; o.x = Math.cos(a) * r; o.y = Math.sin(a) * r * .7; o.z = rnd(500, -2700); starCol(o.col); o.s = 1.4 * (.4 + Math.pow(Math.random(), 4) * 2.6); }, pointsMat(1, .9));
    mk(q ? 9000 : 4000, (i, o) => { const u = rnd(-1, 1), a = rnd(0, 6.283), s = Math.sqrt(1 - u * u); o.x = 3500 * s * Math.cos(a); o.y = 3500 * u; o.z = -1000 + 3500 * s * Math.sin(a); starCol(o.col); o.s = rnd(.8, 2); }, pointsMat(1, .8));

    // galaksi spiral raksasa (3 lengan) + inti bercahaya
    const gMat = pointsMat(5, 0), galTilt = new THREE.Group();
    const gal = points(q ? 60000 : 22000, (i, o) => {
      const t = Math.pow(Math.random(), .55), rr = t * 430, ang = (i % 3) / 3 * 6.283 + t * 5.2, sp = Math.pow(Math.random(), 3) * (rr * .3 + 10);
      o.x = Math.cos(ang) * rr + rnd(-1, 1) * sp; o.z = Math.sin(ang) * rr + rnd(-1, 1) * sp; o.y = rnd(-1, 1) * (26 * (1 - t) + 3) * Math.random();
      (t < .35 ? o.col.copy(C1).lerp(C2, t / .35) : o.col.copy(C2).lerp(C3, (t - .35) / .65)).multiplyScalar(rnd(.6, 1.8));
      o.s = rnd(1.4, 3.4) * (t < .15 ? .7 : 1);
    }, gMat);
    gal.frustumCulled = false; mats.push(gMat); galTilt.add(gal);
    const gt = glowTex(); tex.push(gt);
    for (const [sc, c, op] of [[380, 0xffd9a0, .8], [900, 0x8b5cf6, .25]]) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: c, blending: ADD, depthWrite: false, transparent: true, opacity: op })); s.scale.set(sc, sc, 1); s.userData.op = op; galTilt.add(s);
    }
    galTilt.position.set(0, -30, -900); galTilt.rotation.set(-1.05, 0, .35); scene.add(galTilt);

    // nebula: sprite besar yang memudar saat kamera menembusnya
    const nt = blobTex(); tex.push(nt);
    const neb = Array.from({ length: q ? 30 : 18 }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: nt, color: new THREE.Color().setHSL(rnd(.5, .82), .8, .55), blending: ADD, depthWrite: false, transparent: true, opacity: 0, rotation: rnd(0, 6.283) }));
      s.position.set(rnd(-320, 320), rnd(-160, 160), rnd(-250, -1500)); const sc = rnd(320, 760); s.scale.set(sc, sc, 1); s.userData.op = rnd(.25, .5); scene.add(s); return s;
    });

    // asteroid (instanced)
    const aN = q ? 150 : 60, aGeo = new THREE.IcosahedronGeometry(1, 1), ap = aGeo.attributes.position;
    for (let i = 0; i < ap.count; i++) ap.setXYZ(i, ap.getX(i) * rnd(.75, 1.25), ap.getY(i) * rnd(.75, 1.25), ap.getZ(i) * rnd(.75, 1.25));
    const ast = new THREE.InstancedMesh(aGeo, new THREE.MeshStandardMaterial({ color: 0x8a7f78, roughness: .95, flatShading: true, envMapIntensity: .15 }), aN);
    const ad = Array.from({ length: aN }, () => { const a = rnd(0, 6.283), r = rnd(110, 420); return { x: Math.cos(a) * r, y: Math.sin(a) * r * .6, z: rnd(100, -1900), s: rnd(1.2, 6), rx: rnd(-.6, .6), ry: rnd(-.6, .6) }; });
    ast.frustumCulled = false; scene.add(ast);
    const dummy = new THREE.Object3D();

    const planet = makePlanet(210, q ? 5 : 4); scene.add(planet.g);
    const bh = makeBH(); scene.add(bh.g);

    scene.add(new THREE.AmbientLight(0x404060, .6));
    const sun = new THREE.DirectionalLight(0xfff1dd, 2.4); sun.position.copy(LIGHT).multiplyScalar(1000); scene.add(sun);

    // logo 3D metalik (TextGeometry + bevel, pantulan environment) + halo, lampu cyan/magenta, lampu sapuan
    const anchor = new THREE.Group(); anchor.position.copy(LOGO); scene.add(anchor);
    const logoG = new THREE.Group(); anchor.add(logoG);
    let logoW = 66;
    if (font) {
      const geo = new TG.TextGeometry('HEYGAMMER', { font, size: 10, depth: 3.4, curveSegments: 6, bevelEnabled: true, bevelThickness: .35, bevelSize: .28, bevelSegments: 3 });
      geo.center(); geo.computeBoundingBox(); logoW = geo.boundingBox.max.x - geo.boundingBox.min.x;
      logoG.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xd6c7ff, metalness: 1, roughness: .18, envMapIntensity: 1.6, emissive: 0x3b1d8f, emissiveIntensity: .5 })));
      const halo = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x7c3aed, side: THREE.BackSide, transparent: true, opacity: .55, blending: ADD, depthWrite: false })); halo.scale.setScalar(1.035); logoG.add(halo);
    } else {
      logoW = 72;
      logoG.add(new THREE.Mesh(new THREE.PlaneGeometry(72, 18), new THREE.MeshBasicMaterial({ map: logoTexture(), transparent: true, depthWrite: false })));
    }
    const lc = new THREE.PointLight(0x22d3ee, 6000); lc.position.set(-70, 25, 60);
    const lm = new THREE.PointLight(0xec4899, 6000); lm.position.set(70, -15, 50);
    const ls = new THREE.PointLight(0xffffff, 0); ls.position.set(-90, 10, 40);
    anchor.add(lc, lm, ls);
    const wave = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 64), new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0, blending: ADD, depthWrite: false, side: THREE.DoubleSide }));
    anchor.add(wave);

    // post-processing: bloom → lensing/CA/vignette → tone mapping
    let composer = null, bloom = null, lens = null;
    if (EC && RP && BP && SP && OP) {
      composer = new EC.EffectComposer(renderer);
      composer.addPass(new RP.RenderPass(scene, camera));
      bloom = new BP.UnrealBloomPass(new THREE.Vector2(W, H), q ? .85 : .7, .6, .12); composer.addPass(bloom);
      lens = new SP.ShaderPass(LENS); composer.addPass(lens); composer.addPass(new OP.OutputPass());
    }
    const lensU = lens ? lens.uniforms : LENS.uniforms;

    function fit() { // logo selalu muat di layar (portrait & landscape)
      const visW = 2 * 110 * Math.tan(25 * Math.PI / 180) * camera.aspect;
      logoG.userData.fit = Math.min(2.4, visW * (camera.aspect < 1 ? .84 : .6) / logoW);
    }
    function resize(w, h) {
      if (w) { W = w; H = h; }
      renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
      if (composer) { composer.setPixelRatio(pr); composer.setSize(W, H); }
      camera.aspect = W / H; camera.updateProjectionMatrix(); lensU.uA.value = camera.aspect;
      for (const m of mats) m.uniforms.uPx.value = pr;
      fit();
    }
    const onResize = () => resize(innerWidth, innerHeight);
    addEventListener('resize', onResize);
    let tx = 0, ty = 0, px = 0, py = 0;
    const onMove = e => { tx = (e.clientX / W - .5) * 2; ty = (e.clientY / H - .5) * 2; };
    addEventListener('pointermove', onMove);
    resize();

    cleanup = () => {
      removeEventListener('resize', onResize); removeEventListener('pointermove', onMove);
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => { x.dispose(); }); });
      tex.forEach(t => t.dispose()); if (pm) pm.dispose(); if (composer) composer.dispose(); ast.dispose(); renderer.dispose();
    };

    // pemanasan: kompilasi semua shader (termasuk logo) sebelum timeline mulai, supaya tidak patah saat logo muncul
    logoG.visible = true; logoG.scale.setScalar(.001);
    renderer.compile(scene, camera); if (composer) composer.render(); else renderer.render(scene, camera);
    logoG.visible = false;
    cap.className = 'in-cap'; cap.textContent = '';

    const P = new THREE.Vector3(), Q = new THREE.Vector3(), tmp = new THREE.Vector3(), fwd = new THREE.Vector3();
    let t0 = 0, last = 0, ema = .016, capI = -1, tuned = 0, wiped = false;
    const frame = now => {
      if (stopped) return;
      try {
        if (!t0) { t0 = now; last = now; }
        const t = (now - t0) / 1000, dt = clamp((now - last) / 1000, 0, .05); last = now; ema = ema * .9 + dt * .1;
        const x = clamp(t / TP), u = smooth(x), sp = 4 * x * (1 - x), dv = smooth((t - 5.6) / 2);
        CAM.getPoint(u, P); LOOK.getPoint(u, Q);
        px += (tx - px) * .05; py += (ty - py) * .05;
        camera.position.set(P.x + px * 7 + rnd(-1, 1) * sp * .2, P.y - py * 4 + rnd(-1, 1) * sp * .2 + dv * 14, P.z + dv * 120);
        camera.fov = 50 + 11 * sp + 6 * dv; camera.updateProjectionMatrix();
        camera.lookAt(Q); camera.rotateZ(Math.sin(t * .9) * .05 * sp);
        camera.updateMatrixWorld();

        for (const m of mats) m.uniforms.uT.value = t;
        gMat.uniforms.uAl.value = .55 * smooth(t / 2);
        gal.rotation.y += dt * .05;
        const nf = smooth((t - 1.2) / 1.6);
        for (const s of neb) { const d = s.position.distanceTo(camera.position); s.material.opacity = s.userData.op * nf * smooth((d - 60) / 160); }
        planet.mat.uniforms.uT.value = t; planet.body.rotation.y += dt * .03;
        bh.diskMat.uniforms.uT.value = t;
        for (let i = 0; i < aN; i++) {
          const a = ad[i]; dummy.position.set(a.x, a.y, a.z); dummy.rotation.set(t * a.rx, t * a.ry, 0); dummy.scale.setScalar(a.s); dummy.updateMatrix(); ast.setMatrixAt(i, dummy.matrix);
        }
        ast.instanceMatrix.needsUpdate = true;

        // logo muncul di t≈4.5 dengan ledakan cahaya + gelombang kejut + sapuan lampu
        const lr = t - 4.5;
        logoG.visible = lr > 0;
        if (lr > 0) {
          logoG.scale.setScalar(Math.max(.001, logoG.userData.fit * outBack(lr / .9)));
          logoG.rotation.y = (1 - smooth(lr / 1.6)) * -.9 + Math.sin(t * .7) * .05;
          logoG.position.y = Math.sin(t * 1.3) * .6;
          const sw = smooth((t - 5) / 1.4); ls.position.x = -90 + 180 * sw; ls.intensity = 9000 * Math.sin(Math.PI * sw);
          const wp = clamp((t - 4.8) / 1.2); wave.scale.setScalar(8 + 260 * smooth(wp)); wave.material.opacity = .9 * (1 - wp) * (wp > 0 ? 1 : 0);
        }

        // lensing black hole: kuat saat dekat dan berada di depan kamera
        tmp.copy(BH).project(camera); fwd.copy(BH).sub(camera.position);
        const front = fwd.dot(camera.getWorldDirection(P)) > 0;
        lensU.uC.value.set(tmp.x * .5 + .5, tmp.y * .5 + .5);
        lensU.uS.value = front ? .13 * clamp(1 - fwd.length() / 1100) : 0;
        lensU.uCA.value = .012 + .05 * sp;
        if (bloom) bloom.strength = (q ? .85 : .7) + 1.3 * Math.exp(-Math.max(0, t - 4.8) * 3.5) * (t > 4.8 ? 1 : 0);

        const c = CAPS.findIndex(([a, b]) => t >= a && t < b);
        if (c !== capI) { capI = c; cap.classList.remove('on'); if (c >= 0) { cap.textContent = CAPS[c][2]; void cap.offsetWidth; cap.classList.add('on'); } }
        if (!wiped && t >= DUR - .9) { wiped = true; root.classList.add('wipe'); }

        // adaptif: kalau FPS rendah turunkan resolusi, lalu matikan bloom
        if (t > .8 && tuned === 0 && ema > .026) { tuned = 1; pr = Math.max(.6, pr * .7); resize(); }
        else if (t > 1.8 && tuned === 1 && ema > .026) { tuned = 2; if (bloom) bloom.enabled = false; }

        if (composer) composer.render(dt); else renderer.render(scene, camera);
        if (t >= DUR) { onDone(); return; }
        raf = requestAnimationFrame(frame);
      } catch (e) { console.warn('Intro 3D error, memakai logo statis.', e); cleanup(); fallback(); }
    };
    raf = requestAnimationFrame(frame);
  }
}

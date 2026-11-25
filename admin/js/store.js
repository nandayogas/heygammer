/* HEYGAMMER Admin Studio — lapisan data.
 * Dua mode:
 *  - DEMO: data di localStorage browser (jika firebase-config.js belum diisi).
 *  - LIVE: Firebase Auth + Firestore. Cache di memori, setiap tulis langsung ke Firestore;
 *          jika tulis gagal, cache dikembalikan (rollback) dan error ditampilkan.
 * Keamanan yang sebenarnya ada di Firestore Rules (admin/firebase/firestore.rules). */
(function () {
  const HG = (window.HG = window.HG || {});
  const KEY = 'heygammer-admin-demo-v1';
  const SESSION = 'heygammer-admin-session';
  const DAY = 864e5;
  const QUOTA = 4.5 * 1024 * 1024;
  const FB = window.HG_FIREBASE || null;
  const FIRE = !!(FB && FB.apiKey && !String(FB.apiKey).startsWith('YOUR_'));

  HG.mode = FIRE ? 'firebase' : 'demo';
  HG.QUOTA = QUOTA;
  HG.PERMS = {
    super_admin: ['games.write', 'games.publish', 'games.delete', 'uploads', 'categories', 'homepage', 'appearance', 'media', 'site.publish', 'analytics', 'settings', 'users.manage', 'users.roles', 'logs'],
    admin: ['games.write', 'games.publish', 'games.delete', 'uploads', 'categories', 'homepage', 'appearance', 'media', 'site.publish', 'analytics', 'settings', 'users.manage', 'logs'],
    editor: ['games.write', 'games.publish', 'uploads', 'categories', 'homepage', 'appearance', 'media', 'analytics'],
    player: []
  };
  const STAFF = ['super_admin', 'admin', 'editor'];
  HG.ROLE_LABEL = { super_admin: 'Super Admin', admin: 'Admin', editor: 'Editor', player: 'Player' };
  HG.SECTION_TYPES = [
    { type: 'hero', title: 'Hero Banner' }, { type: 'featured', title: 'Featured Games' },
    { type: 'trending', title: 'Trending Games' }, { type: 'recent', title: 'Recently Added' },
    { type: 'categories', title: 'Popular Categories' }, { type: 'recommended', title: 'Recommended Games' },
    { type: 'newsletter', title: 'Newsletter' }, { type: 'footer', title: 'Footer' }
  ];
  HG.FONTS = ['Inter', 'Geist', 'Space Grotesk', 'system-ui'];

  const iso = (ms) => new Date(ms).toISOString();
  const now = () => iso(Date.now());
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));
  const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 9);
  const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  HG.slugify = slugify;

  const svgThumb = (label, c1, c2) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs>' +
    '<rect width="640" height="360" fill="url(#g)"/><text x="50%" y="56%" font-family="Arial" font-size="110" font-weight="700" ' +
    'fill="rgba(255,255,255,.85)" text-anchor="middle">' + label + '</text></svg>');

  function defaultSettings() {
    return {
      name: 'HEYGAMMER', tagline: 'Portal menuju universe gaming', logoUrl: '', faviconUrl: '',
      seoTitle: 'HEYGAMMER — Game Universe', metaDescription: 'Mainkan game HTML5 futuristik langsung dari browser.',
      keywords: 'game, html5, browser game', ogImageUrl: '',
      heroTitle: 'ENTER THE UNIVERSE', heroSubtitle: 'Ribuan game HTML5 futuristik, langsung dimainkan tanpa install.',
      heroButtonText: 'MAIN SEKARANG', heroButtonLink: '#games', heroBannerUrl: '',
      bgColor: '#090B10', accent: '#657DFF', accent2: '#956BFF', font: 'Inter', spacing: 'comfortable', cardsPerRow: 4,
      footerText: '© HEYGAMMER. Semua hak dilindungi.',
      social: { youtube: '', tiktok: '', instagram: '', discord: '' },
      nav: [{ label: 'Games', href: '#games' }, { label: 'Kategori', href: '#categories' }, { label: 'Tentang', href: '#about' }],
      maintenance: false, language: 'id', theme: 'dark'
    };
  }
  function defaultSections() {
    return ['hero', 'featured', 'trending', 'recent', 'categories', 'recommended', 'newsletter', 'footer'].map((type, i) => ({
      id: 'sec-' + type, type, title: HG.SECTION_TYPES.find((s) => s.type === type).title, enabled: true, order: i + 1, limit: 8
    }));
  }
  function emptyState() {
    return {
      me: null, categories: [], games: [], users: [], media: [], logs: [],
      site: { settings: { draft: defaultSettings(), published: defaultSettings() }, sections: { draft: defaultSections(), published: defaultSections() }, publishedAt: null }
    };
  }

  function seed() {
    const t = Date.now();
    const cat = (id, name, color, order, visible) => ({ id, name, slug: slugify(name), color, order, visible, createdAt: iso(t - 60 * DAY), updatedAt: iso(t - 60 * DAY) });
    const categories = [
      cat('cat-action', 'Action', '#FF5C7A', 1, true), cat('cat-racing', 'Racing', '#657DFF', 2, true),
      cat('cat-arcade', 'Arcade', '#956BFF', 3, true), cat('cat-adventure', 'Adventure', '#34D399', 4, true),
      cat('cat-puzzle', 'Puzzle', '#FBBF24', 5, false)
    ];
    const colorOf = (id) => (categories.find((c) => c.id === id) || {}).color || '#657DFF';
    const game = (title, category, file, o) => ({
      id: uid('gam'), title, slug: slugify(title), description: o.desc, category, tags: o.tags,
      thumbnail: svgThumb(title.slice(0, 2).toUpperCase(), colorOf(category), '#11151D'),
      gameUrl: 'games/' + file, status: o.status || 'published', featured: !!o.featured,
      order: o.order, plays: o.plays, createdAt: iso(t - o.age * DAY), updatedAt: iso(t - 2 * DAY)
    });
    const games = [
      game('Neon Rush', 'cat-racing', 'neonrush.html', { desc: 'Balap neon futuristik dengan jalur penuh bahaya.', tags: ['racing', 'neon'], featured: true, order: 1, plays: 12840, age: 40 }),
      game('Kart Universe', 'cat-racing', 'kart.html', { desc: 'Balap kart di galaksi berwarna-warni.', tags: ['kart', 'multiplayer'], featured: true, order: 2, plays: 9650, age: 30 }),
      game('Subway Runner', 'cat-arcade', 'subwayrunner.html', { desc: 'Lari tanpa henti menghindari rintangan kereta.', tags: ['endless', 'runner'], order: 3, plays: 7420, age: 25 }),
      game('Neon Blast', 'cat-action', 'neonblast.html', { desc: 'Tembak musuh neon dalam arena cepat.', tags: ['shooter'], order: 4, plays: 5320, age: 20 }),
      game('Arena Brawler', 'cat-action', 'arenabrawler.html', { desc: 'Pertarungan arena satu lawan satu.', tags: ['fighting'], order: 5, plays: 3110, age: 12, status: 'draft' }),
      game('Hill Climb Adventure', 'cat-adventure', 'hillclimbadventure.html', { desc: 'Daki bukit liar dengan kendaraan kecil.', tags: ['physics'], order: 6, plays: 2280, age: 8 }),
      game('Tropical Kart', 'cat-racing', 'tropicalkart.html', { desc: 'Balap kart di pantai tropis.', tags: ['kart'], order: 7, plays: 0, age: 3, status: 'draft' })
    ];
    const user = (name, email, role, o = {}) => ({
      id: uid('usr'), name, email, password: 'demo123', role, status: o.status || 'active',
      createdAt: iso(t - (o.age || 30) * DAY), lastLogin: o.last === null ? null : iso(t - (o.last ?? 1) * DAY)
    });
    const users = [
      user('Super Admin Demo', 'superadmin@heygammer.demo', 'super_admin', { age: 200 }),
      user('Admin Demo', 'admin@heygammer.demo', 'admin', { age: 120 }),
      user('Editor Demo', 'editor@heygammer.demo', 'editor', { age: 60 }),
      user('Rizky Pratama', 'rizky@example.com', 'player', { age: 40, last: 2 }),
      user('Dina Kartika', 'dina@example.com', 'player', { age: 25, last: 0 }),
      user('Bagas Saputra', 'bagas@example.com', 'player', { age: 12, status: 'suspended', last: 9 }),
      user('Sinta Lestari', 'sinta@example.com', 'player', { age: 5 })
    ];
    const media = [
      { name: 'banner-neon.svg', kind: 'banner', url: svgThumb('NEON', '#657DFF', '#956BFF') },
      { name: 'logo-heygammer.svg', kind: 'logo', url: svgThumb('HG', '#956BFF', '#657DFF') },
      { name: 'thumb-kart.svg', kind: 'thumbnail', url: svgThumb('KART', '#34D399', '#657DFF') }
    ].map((m) => ({ id: uid('med'), ...m, type: 'image/svg+xml', size: m.url.length, createdAt: iso(t - 10 * DAY), updatedAt: iso(t - 10 * DAY) }));
    const logs = [
      { action: 'Publish perubahan website', target: 'Homepage & appearance', actor: 'Super Admin Demo', at: iso(t - 2 * DAY) },
      { action: 'Upload game', target: 'Neon Rush', actor: 'Editor Demo', at: iso(t - 5 * DAY) },
      { action: 'Ubah role', target: 'Rizky Pratama → player', actor: 'Admin Demo', at: iso(t - 9 * DAY) }
    ].map((l) => ({ id: uid('log'), ...l }));
    const settings = defaultSettings();
    const sections = defaultSections();
    return {
      me: null, categories, games, users, media, logs,
      site: { settings: { draft: clone(settings), published: clone(settings) }, sections: { draft: clone(sections), published: clone(sections) }, publishedAt: iso(t - 2 * DAY) }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const s = JSON.parse(raw); if (s && s.site && s.games) return s; }
    } catch (e) { /* data rusak → seed */ }
    return seed();
  }

  let state = FIRE ? emptyState() : load();

  function persist() {
    const raw = JSON.stringify(state);
    if (raw.length > QUOTA) throw new Error('Penyimpanan demo penuh. Hapus media yang tidak dipakai.');
    try { localStorage.setItem(KEY, raw); } catch (e) { throw new Error('Penyimpanan browser penuh: ' + e.message); }
  }

  // Jalur tulis tunggal. fn() mengubah cache dan mengembalikan { result, writes }.
  // writes: [{ coll, id, data }] (data null = hapus). Gagal → cache dikembalikan.
  async function commit(writes) {
    if (!FIRE) return persist();
    for (const w of writes) {
      if (w.data === null) await window.HGFire.delDoc(w.coll, w.id);
      else await window.HGFire.setDoc(w.coll, w.id, w.data);
    }
  }
  async function txn(fn) {
    const backup = JSON.stringify(state);
    try {
      const { result, writes = [] } = fn();
      await commit(writes);
      return result;
    } catch (e) {
      state = JSON.parse(backup);
      throw e;
    }
  }

  const safe = (u) => { const { password, ...rest } = u; return rest; };

  function friendlyAuthError(e) {
    const c = e && e.code || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return 'Email atau kata sandi salah.';
    if (/too-many-requests/.test(c)) return 'Terlalu banyak percobaan. Coba lagi nanti.';
    if (/network-request-failed/.test(c)) return 'Tidak ada koneksi internet.';
    return (e && e.message) || 'Login gagal.';
  }

  // ---- LIVE: tunggu jembatan Firebase, lalu pulihkan sesi
  function fireReady() {
    return new Promise((res, rej) => {
      if (window.HGFire) return res();
      const t = setTimeout(() => rej(new Error('Firebase gagal dimuat. Periksa koneksi internet.')), 9000);
      window.addEventListener('hgfire-ready', () => { clearTimeout(t); res(); }, { once: true });
    });
  }
  const settle = (p, d) => p.then((v) => v, () => d);

  async function loadAll() {
    const F = window.HGFire;
    const [games, categories, media, logs, users, admins, draft, pub] = await Promise.all([
      settle(F.readColl('games'), []), settle(F.readColl('categories'), []), settle(F.readColl('media'), []),
      settle(F.readColl('activity_logs', 'at', 200), []), settle(F.readColl('users'), []), settle(F.readColl('admins'), []),
      settle(F.readDoc('website_settings', 'draft'), null), settle(F.readDoc('website_settings', 'published'), null)
    ]);
    state.games = games;
    state.categories = categories;
    state.media = media;
    state.logs = logs.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
    const adminMap = new Map(admins.map((a) => [a.id, a]));
    const list = users.map((u) => ({ ...u, role: adminMap.get(u.id) ? adminMap.get(u.id).role : 'player' }));
    for (const a of admins) {
      if (!list.some((u) => u.id === a.id)) list.push({ id: a.id, name: a.name || 'Admin', email: a.email || '', role: a.role, status: 'active', createdAt: a.createdAt || null, lastLogin: null });
    }
    state.users = list;
    state.site.settings.draft = (draft && draft.settings) || defaultSettings();
    state.site.sections.draft = (draft && draft.sections) || defaultSections();
    state.site.settings.published = (pub && pub.settings) || defaultSettings();
    state.site.sections.published = (pub && pub.sections) || defaultSections();
    state.site.publishedAt = pub ? pub.publishedAt || null : null;
  }

  async function hydrate(uid, email) {
    const F = window.HGFire;
    const adm = await F.readDoc('admins', uid);
    if (!adm) { await F.logout(); state.me = null; throw new Error('Akun ini belum terdaftar sebagai admin (koleksi admins).'); }
    const prof = await settle(F.readDoc('users', uid), null);
    const status = (prof && prof.status) || 'active';
    if (status !== 'active') { await F.logout(); state.me = null; throw new Error('Akun ini dinonaktifkan.'); }
    state.me = { id: uid, name: adm.name || email, email: email || adm.email || '', role: adm.role, status };
    await loadAll();
  }

  HG.ready = FIRE
    ? fireReady().then(() => window.HGFire.whenAuth()).then((u) => (u ? hydrate(u.uid, u.email) : null))
    : Promise.resolve();

  // ---- Auth
  HG.login = async (email, password) => {
    if (FIRE) {
      await fireReady();
      const addr = String(email).trim();
      let uid;
      try { uid = await window.HGFire.login(addr, password); }
      catch (e) { throw new Error(friendlyAuthError(e)); }
      await hydrate(uid, addr);
      return clone(state.me);
    }
    await wait(300);
    const u = state.users.find((x) => x.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!u || u.password !== password) throw new Error('Email atau kata sandi salah.');
    if (u.status !== 'active') throw new Error('Akun ini dinonaktifkan.');
    if (u.role === 'player') throw new Error('Akun ini tidak punya akses admin.');
    state.users.forEach((x) => { if (x.id === u.id) x.lastLogin = now(); });
    persist();
    sessionStorage.setItem(SESSION, u.id);
    return safe(u);
  };
  HG.logout = () => {
    if (FIRE) { state.me = null; window.HGFire.logout().catch(() => {}); return; }
    sessionStorage.removeItem(SESSION);
  };
  HG.me = () => {
    if (FIRE) return state.me;
    const id = sessionStorage.getItem(SESSION);
    const u = state.users.find((x) => x.id === id);
    return u && u.status === 'active' && u.role !== 'player' ? safe(u) : null;
  };
  HG.can = (perm) => { const u = HG.me(); return !!u && (HG.PERMS[u.role] || []).includes(perm); };

  // ---- CRUD
  HG.list = async (coll) => { await wait(60); return clone(state[coll] || []); };

  HG.save = (coll, item) => txn(() => {
    const list = state[coll];
    const t = now();
    if (coll === 'games') {
      const slug = slugify(item.slug || item.title);
      if (!slug) throw new Error('Slug tidak valid.');
      if (list.some((g) => g.slug === slug && g.id !== item.id)) throw new Error('Slug "' + slug + '" sudah dipakai game lain.');
      item = { ...item, slug };
    }
    const i = item.id ? list.findIndex((x) => x.id === item.id) : -1;
    let rec;
    if (i >= 0) { rec = { ...list[i], ...item, updatedAt: t }; list[i] = rec; }
    else { rec = { ...item, id: uid(coll.slice(0, 3)), createdAt: t, updatedAt: t }; list.push(rec); }
    const writes = [];
    if (coll === 'users') {
      // Profil publik di users (tanpa role & kata sandi). Role resmi ada di admins.
      const { role, password, ...profile } = clone(rec);
      writes.push({ coll: 'users', id: rec.id, data: profile });
      if ('role' in item) {
        writes.push({ coll: 'admins', id: rec.id, data: STAFF.includes(role) ? { role, name: rec.name, email: rec.email, createdAt: rec.createdAt || t } : null });
      }
    } else {
      writes.push({ coll, id: rec.id, data: clone(rec) });
    }
    return { result: clone(rec), writes };
  });

  HG.remove = (coll, id) => txn(() => {
    state[coll] = state[coll].filter((x) => x.id !== id);
    return { result: true, writes: [{ coll, id, data: null }] };
  });

  HG.log = (action, target = '') => {
    const me = HG.me();
    const rec = { id: uid('log'), actor: me ? me.name : 'System', action, target, at: now() };
    txn(() => {
      state.logs.unshift(rec);
      state.logs = state.logs.slice(0, 200);
      return { result: true, writes: [{ coll: 'activity_logs', id: rec.id, data: clone(rec) }] };
    }).catch((e) => console.warn('Log aktivitas gagal:', e.message));
  };

  // ---- Situs
  HG.getSite = async (stage) => {
    await wait(60);
    return clone({ settings: state.site.settings[stage], sections: state.site.sections[stage], publishedAt: state.site.publishedAt || null });
  };
  HG.saveDraft = async ({ settings, sections }) => {
    await wait(60);
    return txn(() => {
      state.site.settings.draft = clone(settings);
      state.site.sections.draft = clone(sections);
      return { result: true, writes: [{ coll: 'website_settings', id: 'draft', data: { settings: clone(settings), sections: clone(sections) } }] };
    });
  };
  HG.publishSite = async () => {
    await wait();
    return txn(() => {
      const d = state.site;
      d.settings.published = clone(d.settings.draft);
      d.sections.published = clone(d.sections.draft);
      d.publishedAt = now();
      return { result: true, writes: [{ coll: 'website_settings', id: 'published', data: { settings: clone(d.settings.published), sections: clone(d.sections.published), publishedAt: d.publishedAt } }] };
    });
  };
  HG.isDirty = () =>
    JSON.stringify(state.site.settings.draft) !== JSON.stringify(state.site.settings.published) ||
    JSON.stringify(state.site.sections.draft) !== JSON.stringify(state.site.sections.published);

  // ---- Analytics DEMO (belum dari Firebase Analytics)
  HG.analytics = async (days) => {
    await wait(180);
    let s = 7;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const out = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY);
      const wk = d.getDay() === 0 || d.getDay() === 6 ? 1.25 : 1;
      const trend = 1 + ((days - i) / days) * 0.35;
      const visitors = Math.round((420 + r() * 260) * wk * trend);
      out.push({ date: d.toISOString().slice(0, 10), visitors, views: Math.round(visitors * (2.2 + r() * 0.9)), launches: Math.round(visitors * (0.45 + r() * 0.25)) });
    }
    return out;
  };

  HG.storageUsage = () => ({
    used: FIRE ? 0 : JSON.stringify(state).length,
    quota: QUOTA,
    media: state.media.reduce((a, m) => a + (m.size || 0), 0)
  });

  HG.reset = async () => {
    if (FIRE) throw new Error('Reset hanya tersedia di mode DEMO.');
    await wait();
    state = seed();
    persist();
    sessionStorage.removeItem(SESSION);
  };
})();

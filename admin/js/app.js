/* HEYGAMMER Admin Studio — shell, router, dan komponen bersama. */
(function () {
  const HG = window.HG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString('id-ID');
  const dt = (s) => (s ? new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const ago = (s) => {
    if (!s) return '—';
    const m = Math.round((Date.now() - new Date(s)) / 60000);
    if (m < 1) return 'baru saja';
    if (m < 60) return m + ' menit lalu';
    const h = Math.round(m / 60);
    if (h < 24) return h + ' jam lalu';
    return Math.round(h / 24) + ' hari lalu';
  };
  const icons = () => { if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } }); };
  const page = (title, sub = '', actions = '') =>
    `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div>${actions ? `<div class="page-actions">${actions}</div>` : ''}</div>`;
  const badge = (text, tone = '') => `<span class="badge ${tone}">${esc(text)}</span>`;

  // ---- Toast
  function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    const ic = { success: 'check-circle-2', error: 'alert-octagon', info: 'info' }[type] || 'info';
    el.innerHTML = `<i data-lucide="${ic}"></i><span>${esc(msg)}</span>`;
    $('#toasts').appendChild(el);
    icons();
    setTimeout(() => el.classList.add('out'), 3200);
    setTimeout(() => el.remove(), 3600);
  }

  // ---- Modal
  let closeHook = null;
  function closeModal() {
    const h = closeHook;
    closeHook = null;
    $('#modalRoot').innerHTML = '';
    if (h) h();
  }
  function modal({ title, body, footer = '', wide = false, onMount, onClose }) {
    const root = $('#modalRoot');
    root.innerHTML = `<div class="overlay"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header><h3>${esc(title)}</h3><button class="btn-icon" data-close type="button" aria-label="Tutup"><i data-lucide="x"></i></button></header>
      <div class="modal-body">${body}</div>${footer ? `<footer>${footer}</footer>` : ''}</div></div>`;
    const ov = root.querySelector('.overlay');
    ov.addEventListener('click', (e) => { if (e.target === ov || e.target.closest('button[data-close]')) closeModal(); });
    closeHook = onClose || null;
    const m = root.querySelector('.modal');
    icons();
    if (onMount) onMount(m);
    setTimeout(() => { const f = m.querySelector('input,select,textarea'); (f || m).focus?.(); }, 30);
    return m;
  }
  function confirmBox(message, { title = 'Konfirmasi', okText = 'Lanjutkan', danger = true } = {}) {
    return new Promise((resolve) => {
      modal({
        title,
        body: `<p class="muted">${esc(message)}</p>`,
        footer: `<button class="btn btn-ghost" data-close type="button">Batal</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="cfOk" type="button">${esc(okText)}</button>`,
        onMount: (m) => { m.querySelector('#cfOk').onclick = () => { closeHook = null; closeModal(); resolve(true); }; },
        onClose: () => resolve(false)
      });
    });
  }

  // ---- Helper async dengan loading state dan notifikasi error
  async function run(btn, fn) {
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }
    try { return await fn(); }
    catch (e) { toast(e.message || 'Terjadi kesalahan', 'error'); return undefined; }
    finally { if (btn) { btn.disabled = false; btn.classList.remove('loading'); } }
  }

  // ---- Binding form generik: <input data-k="a.b"> ↔ obj.a.b
  function bindFields(root, obj, onChange) {
    const get = (o, k) => k.split('.').reduce((a, p) => (a ? a[p] : undefined), o);
    const set = (o, k, v) => { const ps = k.split('.'), last = ps.pop(); ps.reduce((a, p) => a[p], o)[last] = v; };
    $$('[data-k]', root).forEach((el) => {
      const cur = get(obj, el.dataset.k);
      if (el.type === 'checkbox') el.checked = !!cur; else el.value = cur ?? '';
      el.oninput = el.onchange = () => {
        const v = el.type === 'checkbox' ? el.checked : (el.type === 'number' || el.type === 'range') ? Number(el.value) : el.value;
        set(obj, el.dataset.k, v);
        onChange && onChange();
      };
    });
  }

  // ---- Route & navigasi
  const ROUTES = [
    { id: 'overview', label: 'Overview', icon: 'layout-dashboard' },
    { id: 'games', label: 'Game Library', icon: 'gamepad-2' },
    { id: 'uploader', label: 'Upload Games', icon: 'upload-cloud', perm: 'uploads' },
    { id: 'categories', label: 'Categories', icon: 'tags', perm: 'categories' },
    { id: 'homepage', label: 'Homepage Builder', icon: 'layout-template', perm: 'homepage' },
    { id: 'appearance', label: 'Website Appearance', icon: 'palette', perm: 'appearance' },
    { id: 'media', label: 'Media Library', icon: 'image', perm: 'media' },
    { id: 'users', label: 'User Management', icon: 'users', perm: 'users.manage' },
    { id: 'analytics', label: 'Analytics', icon: 'bar-chart-3', perm: 'analytics' },
    { id: 'seo', label: 'SEO Settings', icon: 'search', perm: 'settings' },
    { id: 'settings', label: 'General Settings', icon: 'settings', perm: 'settings' }
  ];
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs = ''] = h.split('?');
    return { id: path || 'overview', q: Object.fromEntries(new URLSearchParams(qs)) };
  }
  function renderNav() {
    const cur = parseHash().id;
    $('#nav').innerHTML = ROUTES.filter((r) => !r.perm || HG.can(r.perm))
      .map((r) => `<a href="#/${r.id}" class="nav-link ${r.id === cur ? 'active' : ''}" data-tip="${esc(r.label)}"><i data-lucide="${r.icon}"></i><span>${esc(r.label)}</span></a>`).join('');
    icons();
  }
  function closeDrawer() { document.body.classList.remove('drawer-open'); }
  function closePanels() { $$('.panel').forEach((p) => (p.hidden = true)); }
  function togglePanel(id, render) {
    const p = $('#' + id);
    const open = p.hidden;
    closePanels();
    p.hidden = !open;
    if (open && render) render();
  }

  async function route() {
    if (!HG.me()) return;
    const { id } = parseHash();
    const r = ROUTES.find((x) => x.id === id);
    if (!r || (r.perm && !HG.can(r.perm))) { location.hash = '#/overview'; return; }
    renderNav(); closeDrawer(); closePanels();
    $('#crumb').textContent = r.label;
    const root = $('#view');
    root.innerHTML = '<div class="skeleton"><div class="sk h1"></div><div class="sk"></div><div class="sk"></div></div>';
    try {
      await window.HGViews[id].render(root, parseHash().q);
    } catch (e) {
      console.error(e);
      root.innerHTML = `<div class="empty"><i data-lucide="alert-octagon"></i><h3>Gagal memuat halaman</h3><p class="muted">${esc(e.message)}</p><button class="btn" onclick="location.reload()" type="button">Coba lagi</button></div>`;
    }
    icons();
  }

  // ---- Pencarian global
  async function runSearch() {
    const q = $('#gsearch').value.trim().toLowerCase();
    const box = $('#gresults');
    if (!q) { box.hidden = true; return; }
    const [games, users, media] = await Promise.all([HG.list('games'), HG.can('users.manage') ? HG.list('users') : [], HG.can('media') ? HG.list('media') : []]);
    const row = (href, icon, title, sub) => `<a href="${href}"><i data-lucide="${icon}"></i><span><b>${esc(title)}</b><small>${esc(sub)}</small></span></a>`;
    const html = [
      ...games.filter((x) => (x.title + ' ' + x.slug + ' ' + (x.tags || []).join(' ')).toLowerCase().includes(q)).slice(0, 5)
        .map((x) => row('#/games?q=' + encodeURIComponent(x.title), 'gamepad-2', x.title, 'Game · ' + x.status)),
      ...users.filter((x) => (x.name + ' ' + x.email).toLowerCase().includes(q)).slice(0, 4)
        .map((x) => row('#/users?q=' + encodeURIComponent(x.email), 'user', x.name, 'User · ' + HG.ROLE_LABEL[x.role])),
      ...media.filter((x) => x.name.toLowerCase().includes(q)).slice(0, 4)
        .map((x) => row('#/media?q=' + encodeURIComponent(x.name), 'image', x.name, 'Media · ' + x.kind))
    ];
    box.innerHTML = html.length ? html.join('') : `<p class="muted pad">Tidak ada hasil untuk "${esc(q)}"</p>`;
    box.hidden = false;
    icons();
  }

  async function renderNotifs() {
    const [logs, games] = await Promise.all([HG.list('logs'), HG.list('games')]);
    const drafts = games.filter((g) => g.status !== 'published').length;
    const changes = HG.isDirty();
    $('#notifCount').textContent = drafts + (changes ? 1 : 0) || '';
    $('#notifBody').innerHTML = `<div class="panel-head">Notifikasi</div>` +
      (changes ? `<a href="#/homepage" class="notif"><i data-lucide="alert-circle"></i><span>Ada perubahan website yang belum dipublish</span></a>` : '') +
      (drafts ? `<a href="#/games" class="notif"><i data-lucide="file-clock"></i><span>${drafts} game berstatus draft</span></a>` : '') +
      (logs.slice(0, 6).map((l) => `<div class="notif"><i data-lucide="activity"></i><span><b>${esc(l.action)}</b> ${esc(l.target)}<small>${esc(l.actor)} · ${ago(l.at)}</small></span></div>`).join('') || '<p class="muted pad">Belum ada aktivitas.</p>');
    icons();
  }

  function showLogin() {
    $('#app').hidden = true;
    $('#login').hidden = false;
    $('#lPass').value = '';
  }
  function showApp() {
    const me = HG.me();
    $('#login').hidden = true;
    $('#app').hidden = false;
    $('#meName').textContent = me.name;
    $('#meRole').textContent = HG.ROLE_LABEL[me.role];
    $('#meAvatar').textContent = me.name[0];
    $('#meAvatarSb').textContent = me.name[0];
    $('#pmName').textContent = me.name;
    $('#pmEmail').textContent = me.email;
    $('#pmRole').textContent = HG.ROLE_LABEL[me.role];
    renderNav();
    HG.getSite('published').then((s) => { $('#themePill').textContent = 'Theme: ' + s.settings.theme; });
    route();
  }

  function wire() {
    $('#loginForm').onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('#loginBtn');
      $('#loginErr').textContent = '';
      btn.disabled = true; btn.textContent = 'Memeriksa…';
      try {
        await HG.login($('#lEmail').value, $('#lPass').value);
        if (!location.hash || location.hash === '#') location.hash = '#/overview';
        showApp();
        toast('Selamat datang, ' + HG.me().name);
      } catch (err) {
        $('#loginErr').textContent = err.message;
      } finally {
        btn.disabled = false; btn.textContent = 'Masuk ke Studio';
      }
    };
    $$('[data-demo]').forEach((b) => (b.onclick = () => { $('#lEmail').value = b.dataset.demo; $('#lPass').value = 'demo123'; }));
    $('#logoutBtn').onclick = () => { HG.logout(); showLogin(); toast('Kamu sudah keluar.', 'info'); };
    $('#collapseBtn').onclick = () => {
      document.body.classList.toggle('sb-collapsed');
      localStorage.setItem('hg-sb', document.body.classList.contains('sb-collapsed') ? '1' : '0');
    };
    if (localStorage.getItem('hg-sb') === '1') document.body.classList.add('sb-collapsed');
    $('#menuBtn').onclick = () => document.body.classList.toggle('drawer-open');
    $('#scrim').onclick = closeDrawer;
    $('#notifBtn').onclick = (e) => { e.stopPropagation(); togglePanel('notifPanel', renderNotifs); };
    $('#profileBtn').onclick = (e) => { e.stopPropagation(); togglePanel('profilePanel'); };
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.panel-wrap')) closePanels();
      if (!e.target.closest('.search-wrap')) $('#gresults').hidden = true;
      const go = e.target.closest('[data-go]');
      if (go) location.hash = go.dataset.go;
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closePanels(); closeDrawer(); } });
    let tmr;
    $('#gsearch').oninput = () => { clearTimeout(tmr); tmr = setTimeout(runSearch, 180); };
    $('#gsearchForm').onsubmit = (e) => {
      e.preventDefault();
      $('#gresults').hidden = true;
      location.hash = '#/games?q=' + encodeURIComponent($('#gsearch').value.trim());
    };
    $('#gresults').addEventListener('click', () => { $('#gresults').hidden = true; });
    window.addEventListener('hashchange', () => { if (HG.me()) route(); });
  }

  function applyMode() {
    const fire = HG.mode === 'firebase';
    $$('.demo-accounts').forEach((el) => (el.hidden = fire));
    const chip = $('#loginMode');
    if (chip) { chip.textContent = fire ? 'MODE LIVE · FIREBASE' : 'MODE DEMO'; chip.className = 'chip ' + (fire ? 'ok-chip' : 'demo'); }
    const b = $('#demoBanner');
    b.classList.toggle('live', fire);
    b.innerHTML = fire
      ? '<i data-lucide="cloud"></i><span><b>MODE LIVE.</b> Terhubung ke Firebase project heygammer-d8afd. Perubahan tersimpan ke server.</span>'
      : '<i data-lucide="flask-conical"></i><span><b>MODE DEMO.</b> Data tersimpan di browser ini (localStorage) dan belum tersambung ke Firebase. Perubahan <b>tidak</b> dikirim ke server.</span>';
    icons();
  }

  function boot() {
    wire();
    HG.ready.then(
      () => { applyMode(); if (HG.me()) showApp(); else showLogin(); },
      (e) => { applyMode(); showLogin(); $('#loginErr').textContent = e.message; }
    );
  }

  window.HGUI = { $, $$, esc, fmt, dt, ago, icons, toast, modal, closeModal, confirmBox, page, badge, run, bindFields, refresh: () => route() };
  // Tunda sampai semua script (termasuk views.js) siap; route() butuh window.HGViews.
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
})();

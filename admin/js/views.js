/* HEYGAMMER Admin Studio — halaman-halaman admin. */
(function () {
  const HG = window.HG, U = window.HGUI;
  const { $, $$, esc, fmt, dt, ago, toast, modal, closeModal, confirmBox, page, badge, icons, refresh, run, bindFields } = U;
  const can = HG.can;
  const byOrder = (a, b) => (a.order || 0) - (b.order || 0);
  const demoChip = '<span class="chip demo">DEMO</span>';
  const statusBadge = (s) => (s === 'published' ? badge('Published', 'ok') : badge('Draft', 'warn'));
  const empty = (icon, title, text, action = '') => `<div class="empty"><i data-lucide="${icon}"></i><h3>${title}</h3><p class="muted">${text}</p>${action}</div>`;
  const kpi = (label, value, icon, hint = '', tone = '') =>
    `<div class="card kpi ${tone}"><div class="kpi-top"><span>${label}</span><i data-lucide="${icon}"></i></div><b>${value}</b><small class="muted">${hint}</small></div>`;
  const safeColor = (c, d) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : d);
  const urlOk = (u) => !u || (/^(https?:\/\/|\.{0,2}\/?[\w\-./]+)/i.test(u) && !/^\s*(javascript|data|vbscript):/i.test(u));
  const bars = (items) => {
    const max = Math.max(1, ...items.map((i) => i.value));
    return items.map((i) => `<div class="bar-row"><span>${esc(i.label)}</span><div class="bar"><i style="width:${(i.value / max * 100).toFixed(1)}%;background:${i.color}"></i></div><b>${fmt(i.value)}</b></div>`).join('') || '<p class="muted">Belum ada data.</p>';
  };
  const thumbStyle = (url) => (url ? `background-image:url('${esc(url)}')` : '');
  const mediaOpts = (media, kinds) => media.filter((m) => m.type.startsWith('image/') && (!kinds || kinds.includes(m.kind)))
    .map((m) => `<option value="${esc(m.url)}">${esc(m.name)}</option>`).join('');
  const catName = (cats, id) => (cats.find((c) => c.id === id) || {}).name || '—';

  // ---- Grafik garis interaktif (SVG + hover)
  function mountChart(wrap, vals, labels, color = '#657DFF') {
    const W = 640, H = 220, P = 18, n = vals.length;
    const max = Math.max(...vals, 1) * 1.1;
    const xs = vals.map((_, i) => P + (i * (W - 2 * P)) / Math.max(n - 1, 1));
    const ys = vals.map((v) => H - P - (v / max) * (H - 2 * P));
    const pts = xs.map((x, i) => x.toFixed(1) + ',' + ys[i].toFixed(1)).join(' ');
    const gid = 'g' + Math.random().toString(36).slice(2, 8);
    wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Grafik">
      <defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      ${[0, 0.25, 0.5, 0.75, 1].map((t) => `<line class="grid-line" x1="${P}" x2="${W - P}" y1="${P + t * (H - 2 * P)}" y2="${P + t * (H - 2 * P)}"/>`).join('')}
      <polygon points="${P},${H - P} ${pts} ${W - P},${H - P}" fill="url(#${gid})"/>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>
      <line class="cursor" x1="0" x2="0" y1="${P}" y2="${H - P}"/><circle class="dot" r="5" cx="0" cy="0"/>
      <rect class="hit" x="0" y="0" width="${W}" height="${H}" fill="transparent"/></svg><div class="tip" hidden></div>`;
    const svg = wrap.querySelector('svg'), tip = wrap.querySelector('.tip');
    const cur = svg.querySelector('.cursor'), dot = svg.querySelector('.dot');
    svg.addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W;
      const k = Math.min(n - 1, Math.max(0, Math.round((px - P) / ((W - 2 * P) / Math.max(n - 1, 1)))));
      cur.setAttribute('x1', xs[k]); cur.setAttribute('x2', xs[k]);
      dot.setAttribute('cx', xs[k]); dot.setAttribute('cy', ys[k]);
      tip.hidden = false;
      tip.innerHTML = `<b>${fmt(vals[k])}</b><span>${esc(labels[k])}</span>`;
      tip.style.left = (xs[k] / W) * 100 + '%';
    });
    svg.addEventListener('pointerleave', () => { tip.hidden = true; });
  }

  // ---- Preview beranda (HTML mandiri, tanpa script; dibuat dari draft)
  function previewHtml(draft, games, cats) {
    const s = draft.settings;
    const pub = games.filter((g) => g.status === 'published');
    const pad = { compact: 16, comfortable: 28, spacious: 44 }[s.spacing] || 28;
    const cols = Math.min(6, Math.max(2, Number(s.cardsPerRow) || 4));
    const list = (type) => {
      if (type === 'featured') return pub.filter((g) => g.featured).sort(byOrder);
      if (type === 'trending') return [...pub].sort((a, b) => b.plays - a.plays);
      if (type === 'recent') return [...pub].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (type === 'recommended') return pub.filter((g) => !g.featured).sort(byOrder);
      return [];
    };
    const card = (g) => `<div class="card"><div class="thumb" style="${g.thumbnail ? `background-image:url('${esc(g.thumbnail)}')` : ''}"><span>${esc(g.title.slice(0, 1))}</span></div><b>${esc(g.title)}</b><small>${esc(catName(cats, g.category))}</small></div>`;
    const body = [...draft.sections].sort(byOrder).filter((x) => x.enabled).map((sec) => {
      if (sec.type === 'hero') return `<section class="hero"><h1>${esc(s.heroTitle)}</h1><p>${esc(s.heroSubtitle)}</p><a class="cta">${esc(s.heroButtonText)}</a></section>`;
      if (sec.type === 'categories') return `<section><h2>${esc(sec.title)}</h2><div class="cats">${cats.filter((c) => c.visible).sort(byOrder).map((c) => `<span style="border-color:${safeColor(c.color, '#657DFF')}">${esc(c.name)}</span>`).join('')}</div></section>`;
      if (sec.type === 'newsletter') return `<section class="news"><h2>${esc(sec.title)}</h2><p>Dapatkan kabar game baru setiap minggu.</p><div class="nl"><input placeholder="email@kamu.com"><button>Daftar</button></div></section>`;
      if (sec.type === 'footer') {
        const soc = Object.entries(s.social || {}).filter(([, v]) => v).map(([k]) => `<span>${esc(k)}</span>`).join('');
        return `<footer><p>${esc(s.footerText)}</p><nav>${soc}</nav></footer>`;
      }
      const items = list(sec.type).slice(0, sec.limit || 8);
      return `<section><h2>${esc(sec.title)}</h2><div class="grid">${items.length ? items.map(card).join('') : '<p class="muted">Belum ada game yang dipublish.</p>'}</div></section>`;
    }).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(s.seoTitle)}</title><style>
      :root{--bg:${safeColor(s.bgColor, '#090B10')};--accent:${safeColor(s.accent, '#657DFF')};--accent2:${safeColor(s.accent2, '#956BFF')}}
      *{box-sizing:border-box}body{margin:0;background:var(--bg);color:#E8ECF4;font-family:${HG.FONTS.includes(s.font) ? esc(s.font) : 'Inter'},system-ui,sans-serif}
      section,footer{padding:${pad}px ${pad}px}h2{font-size:16px;margin:0 0 12px}
      .hero{text-align:center;padding:${pad * 2}px ${pad}px;background:radial-gradient(600px 300px at 50% 0,rgba(101,125,255,.22),transparent)}
      .hero h1{font-size:34px;letter-spacing:-.02em;margin:0 0 8px}.hero p{color:#8A93A6;margin:0 0 16px}
      .cta{display:inline-block;padding:10px 18px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-weight:600}
      .grid{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:12px}
      .card{background:#11151D;border:1px solid #252B36;border-radius:12px;overflow:hidden}
      .thumb{aspect-ratio:16/9;background:#171C26 center/cover no-repeat;display:grid;place-items:center;font-size:28px;font-weight:700;color:#fff8}
      .card b{display:block;padding:8px 10px 0;font-size:13px}.card small{display:block;padding:0 10px 10px;color:#8A93A6;font-size:11px}
      .cats span{display:inline-block;margin:4px;padding:6px 12px;border:1px solid;border-radius:999px;font-size:13px}
      .news .nl{display:flex;gap:8px;max-width:420px}.news input{flex:1;background:#11151D;border:1px solid #252B36;color:#E8ECF4;border-radius:10px;padding:9px}
      .news button{border:0;border-radius:10px;padding:9px 14px;background:var(--accent);color:#fff}
      footer{border-top:1px solid #252B36;color:#8A93A6;font-size:13px}footer nav{display:flex;gap:12px;margin-top:8px}
      @media(max-width:640px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero h1{font-size:24px}}
    </style></head><body>${body}</body></html>`;
  }

  // ---- Kontroler draft situs bersama (homepage, appearance, seo, settings)
  function bindSiteBar(root, draft, ctx) {
    let timer = null;
    const updateStatus = () => {
      const d = root.querySelector('[data-dirty]');
      if (!d) return;
      const dirty = HG.isDirty();
      d.textContent = dirty ? 'Ada draft yang belum dipublish' : 'Semua perubahan sudah dipublish';
      d.classList.toggle('on', dirty);
    };
    const save = async (quiet) => {
      await HG.saveDraft({ settings: draft.settings, sections: draft.sections });
      const s = root.querySelector('[data-saved]');
      if (s) s.textContent = 'Draft tersimpan ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      updateStatus();
      if (!quiet) toast('Draft tersimpan di browser (demo).');
      return true;
    };
    const changed = () => {
      ctx.onChange && ctx.onChange();
      clearTimeout(timer);
      timer = setTimeout(() => save(true).catch((e) => toast(e.message, 'error')), 500);
      updateStatus();
    };
    const publish = async (btn) => {
      const ok = await confirmBox('Perubahan draft akan langsung tampil ke publik. Lanjutkan?', { title: 'Publish perubahan', okText: 'PUBLISH', danger: false });
      if (!ok) return;
      const done = await run(btn, async () => {
        await save(true);
        await HG.publishSite();
        HG.log('Publish perubahan website', draft.settings.name || 'Website');
        toast('Perubahan berhasil dipublish.');
        return true;
      });
      if (done) { const p = await HG.getSite('published'); $('#themePill').textContent = 'Theme: ' + p.settings.theme; }
      updateStatus();
    };
    const preview = () => modal({
      title: 'Preview website (draft)', wide: true,
      body: `<p class="muted small">Preview ini memakai draft terbaru, belum tampil ke publik.</p><iframe class="preview-frame" title="Preview" sandbox="" srcdoc="${esc(previewHtml(draft, ctx.games, ctx.cats))}"></iframe>`
    });
    root.querySelector('[data-act="save"]').onclick = (e) => run(e.currentTarget, () => save(false));
    root.querySelector('[data-act="preview"]').onclick = preview;
    const pb = root.querySelector('[data-act="publish"]');
    if (pb) pb.onclick = (e) => publish(e.currentTarget);
    return { changed, preview };
  }
  function siteBar() {
    return `<div class="sitebar"><span class="dirty" data-dirty>&nbsp;</span>
      <div class="page-actions"><span class="autosave muted" data-saved></span>
        <button class="btn btn-ghost" data-act="preview" type="button"><i data-lucide="eye"></i>PREVIEW</button>
        <button class="btn btn-ghost" data-act="save" type="button"><i data-lucide="save"></i>SAVE DRAFT</button>
        ${can('site.publish') ? '<button class="btn btn-primary" data-act="publish" type="button"><i data-lucide="rocket"></i>PUBLISH CHANGES</button>' : ''}
      </div></div>`;
  }
  async function siteCtx() {
    const [games, cats, media, draft] = await Promise.all([HG.list('games'), HG.list('categories'), HG.list('media'), HG.getSite('draft')]);
    return { games, cats, media, draft };
  }
  function bindPickers(root) {
    $$('[data-pick]', root).forEach((sel) => {
      sel.onchange = () => {
        if (!sel.value) return;
        const inp = $(`[data-k="${sel.dataset.pick}"]`, root);
        inp.value = sel.value;
        inp.dispatchEvent(new Event('input'));
        sel.value = '';
      };
    });
  }

  const views = {};

  // ================= OVERVIEW =================
  views.overview = {
    async render(root) {
      const [games, users, logs, cats, a, site] = await Promise.all([
        HG.list('games'), HG.list('users'), HG.list('logs'), HG.list('categories'), HG.analytics(30), HG.getSite('published')
      ]);
      const pub = games.filter((g) => g.status === 'published');
      const drafts = games.length - pub.length;
      const players = users.filter((u) => u.role === 'player').length;
      const visits = a.reduce((s, d) => s + d.visitors, 0);
      const top = [...pub].sort((x, y) => y.plays - x.plays).slice(0, 5);
      const recent = [...games].sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 5);
      const catBars = cats.map((c) => ({ label: c.name, color: c.color, value: games.filter((g) => g.category === c.id).reduce((s, g) => s + (g.plays || 0), 0) })).sort((x, y) => y.value - x.value);
      const dirty = HG.isDirty();
      root.innerHTML = page('Overview', 'Pusat kendali universe HEYGAMMER.', `<button class="btn btn-primary" data-go="#/games" type="button"><i data-lucide="plus"></i>Game baru</button>`) + `
        <div class="kpis">
          ${kpi('Published games', fmt(pub.length), 'gamepad-2', 'Tampil di website', 'ok')}
          ${kpi('Draft games', fmt(drafts), 'file-clock', 'Belum dipublish', 'warn')}
          ${kpi('Registered users', fmt(players), 'users', 'Akun player ' + demoChip)}
          ${kpi('Website visits', fmt(visits), 'line-chart', '30 hari terakhir ' + demoChip)}
        </div>
        <div class="grid-2">
          <section class="card"><div class="card-head"><h2>Traffic 30 hari</h2>${demoChip}</div><div class="chart-wrap" id="ovChart"></div></section>
          <section class="card"><div class="card-head"><h2>Website status</h2></div>
            <ul class="status-list">
              <li><span>Mode data</span>${HG.mode === 'demo' ? badge('DEMO · localStorage', 'warn') : badge('LIVE · Firebase', 'ok')}</li>
              <li><span>Publik</span><span>${site.publishedAt ? 'Dipublish ' + ago(site.publishedAt) : 'Belum pernah dipublish'}</span></li>
              <li><span>Draft belum dipublish</span>${dirty ? badge('Ada', 'warn') : badge('Tidak ada', 'ok')}</li>
              <li><span>Maintenance</span>${site.settings.maintenance ? badge('ON', 'err') : badge('OFF', 'ok')}</li>
            </ul></section>
        </div>
        <div class="grid-2">
          <section class="card"><div class="card-head"><h2>Most played</h2></div><div class="list">
            ${top.map((g) => `<div class="list-row"><div class="mini-thumb" style="${thumbStyle(g.thumbnail)}"></div><div class="grow"><b>${esc(g.title)}</b><small>${fmt(g.plays)} plays</small></div></div>`).join('') || '<p class="muted">Belum ada game published.</p>'}
          </div></section>
          <section class="card"><div class="card-head"><h2>Recent uploads</h2><a class="btn btn-ghost btn-sm" href="#/games">Lihat semua</a></div><div class="list">
            ${recent.map((g) => `<div class="list-row"><div class="mini-thumb" style="${thumbStyle(g.thumbnail)}"></div><div class="grow"><b>${esc(g.title)}</b><small>${dt(g.createdAt)} · ${g.status}</small></div></div>`).join('')}
          </div></section>
        </div>
        <div class="grid-2">
          <section class="card"><div class="card-head"><h2>Popular categories</h2>${demoChip}</div>${bars(catBars)}</section>
          <section class="card"><div class="card-head"><h2>Recent admin activities</h2><button class="btn btn-ghost btn-sm" id="allLogs" type="button">Lihat semua</button></div><div class="list">
            ${logs.slice(0, 6).map((l) => `<div class="list-row"><i data-lucide="activity" class="muted"></i><div class="grow"><b>${esc(l.action)}</b><small>${esc(l.actor)} · ${esc(l.target)} · ${ago(l.at)}</small></div></div>`).join('') || '<p class="muted">Belum ada aktivitas.</p>'}
          </div></section>
        </div>`;
      mountChart($('#ovChart', root), a.map((d) => d.visitors), a.map((d) => dt(d.date)));
      $('#allLogs', root).onclick = () => modal({
        title: 'Activity log', wide: true,
        body: `<div class="table-wrap"><table class="table"><thead><tr><th>Waktu</th><th>Admin</th><th>Aksi</th><th>Target</th></tr></thead><tbody>
          ${logs.map((l) => `<tr><td>${dt(l.at)}</td><td>${esc(l.actor)}</td><td>${esc(l.action)}</td><td>${esc(l.target)}</td></tr>`).join('')}</tbody></table></div>`
      });
    }
  };

  // ================= GAMES =================
  function gameFieldsHtml(v, cats, media) {
    const sel = (val) => (val ? 'selected' : '');
    return `<div class="field-grid">
      <label class="full">Judul<input name="title" required maxlength="80" value="${esc(v.title)}"></label>
      <label>Slug<input name="slug" value="${esc(v.slug || '')}" placeholder="otomatis dari judul"></label>
      <label>Kategori<select name="category">${cats.map((c) => `<option value="${esc(c.id)}" ${c.id === v.category ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label class="full">Deskripsi<textarea name="description" rows="3" maxlength="300">${esc(v.description || '')}</textarea></label>
      <label class="full">Tags (pisahkan dengan koma)<input name="tags" value="${esc((v.tags || []).join(', '))}"></label>
      <label class="full">Game URL<input name="gameUrl" value="${esc(v.gameUrl || '')}" placeholder="games/nama.html atau https://…"></label>
      <label>Thumbnail URL<input name="thumbnail" value="${esc(v.thumbnail || '')}" placeholder="https://… atau pilih dari media"></label>
      <label>Pilih dari Media<select data-thumb><option value="">—</option>${mediaOpts(media, ['thumbnail', 'banner'])}</select></label>
      <label>Urutan<input name="order" type="number" min="0" value="${v.order || 0}"></label>
      <label>Status<select name="status"><option value="draft" ${sel(v.status !== 'published')}>Draft</option><option value="published" ${sel(v.status === 'published')}>Published</option></select></label>
      <label class="check full"><input type="checkbox" name="featured" ${v.featured ? 'checked' : ''}> Tampilkan di Featured Games</label>
    </div>`;
  }
  function collectGame(form) {
    const f = form.elements;
    const val = (n) => (f[n] ? String(f[n].value || '').trim() : '');
    return {
      title: val('title'), slug: HG.slugify(val('slug') || val('title')), category: val('category'),
      description: val('description'), tags: val('tags').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12),
      gameUrl: val('gameUrl'), thumbnail: val('thumbnail'), order: Number(val('order')) || 0,
      featured: !!(f.featured && f.featured.checked), status: val('status') || 'draft'
    };
  }
  async function saveGameData(data, existingId, extra = {}) {
    if (!data.title) throw new Error('Judul wajib diisi.');
    if (!urlOk(data.gameUrl) || !urlOk(data.thumbnail)) throw new Error('URL tidak valid. Gunakan https://, path relatif, atau kosongkan.');
    if (data.status === 'published' && !data.gameUrl && !extra.entry) {
      const cur = existingId ? (await HG.list('games')).find((x) => x.id === existingId) : null;
      if (!cur || !cur.entry) throw new Error('Publish butuh Game URL atau file game. Isi dulu, atau simpan sebagai draft.');
    }
    const rec = await HG.save('games', { ...(existingId ? { id: existingId } : {}), ...data, ...extra });
    HG.log(existingId ? 'Update game' : 'Tambah game', rec.title);
    return rec;
  }

  views.games = {
    async render(root, q) {
      const [games, cats, media] = await Promise.all([HG.list('games'), HG.list('categories'), HG.list('media')]);
      const st = { search: q.q || '', status: 'all', cat: 'all' };
      const sorted = () => [...games].sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title));
      root.innerHTML = page('Game Library', `${games.length} game · ${games.filter((g) => g.status === 'published').length} published`,
        can('games.write') ? `<button class="btn btn-primary" data-act="new" type="button"><i data-lucide="plus"></i>Tambah Game</button>` : '') + `
        <div class="toolbar">
          <div class="search"><i data-lucide="search"></i><input id="gq" type="search" placeholder="Cari judul, slug, atau tag" value="${esc(st.search)}"></div>
          <select id="gst"><option value="all">Semua status</option><option value="published">Published</option><option value="draft">Draft</option></select>
          <select id="gcat"><option value="all">Semua kategori</option>${cats.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select>
        </div>
        <div class="card table-wrap"><table class="table"><thead><tr><th>Game</th><th>Kategori</th><th>Status</th><th>Urutan</th><th>Diubah</th><th></th></tr></thead><tbody id="gbody"></tbody></table></div>`;
      const draw = () => {
        const rows = sorted().filter((g) => {
          const s = st.search.toLowerCase();
          return (!s || (g.title + ' ' + g.slug + ' ' + (g.tags || []).join(' ')).toLowerCase().includes(s))
            && (st.status === 'all' || g.status === st.status) && (st.cat === 'all' || g.category === st.cat);
        });
        $('#gbody', root).innerHTML = rows.map((g, i) => `<tr>
          <td><div class="title-cell"><div class="thumb-sm" style="${thumbStyle(g.thumbnail)}"></div><div style="min-width:0"><b>${esc(g.title)}</b><small>${esc(g.slug)} · ${esc((g.tags || []).slice(0, 2).join(', '))}</small></div></div></td>
          <td>${esc(catName(cats, g.category))}</td>
          <td>${statusBadge(g.status)}${g.featured ? ' ' + badge('Featured', '') : ''}</td>
          <td>${can('games.write') ? `<div class="actions" style="justify-content:flex-start"><button class="btn-icon" data-act="up" data-id="${g.id}" type="button" aria-label="Naik" ${i === 0 ? 'disabled' : ''}><i data-lucide="arrow-up"></i></button><button class="btn-icon" data-act="down" data-id="${g.id}" type="button" aria-label="Turun" ${i === rows.length - 1 ? 'disabled' : ''}><i data-lucide="arrow-down"></i></button><span class="muted">${g.order}</span></div>` : g.order}</td>
          <td class="muted">${dt(g.updatedAt)}</td>
          <td><div class="actions">
            ${can('games.write') ? `<button class="btn-icon" data-act="edit" data-id="${g.id}" type="button" aria-label="Edit"><i data-lucide="pencil"></i></button>` : ''}
            ${can('games.publish') ? `<button class="btn-icon" data-act="toggle" data-id="${g.id}" type="button" aria-label="${g.status === 'published' ? 'Batalkan publikasi' : 'Publish'}"><i data-lucide="${g.status === 'published' ? 'eye-off' : 'rocket'}"></i></button>` : ''}
            ${can('games.delete') ? `<button class="btn-icon danger" data-act="del" data-id="${g.id}" type="button" aria-label="Hapus"><i data-lucide="trash-2"></i></button>` : ''}
          </div></td></tr>`).join('') || `<tr><td colspan="6">${empty('gamepad-2', 'Tidak ada game', st.search || st.status !== 'all' || st.cat !== 'all' ? 'Coba ubah filter pencarian.' : 'Tambahkan game pertama atau upload ZIP HTML5.', '')}</td></tr>`;
        icons();
      };
      $('#gq', root).oninput = (e) => { st.search = e.target.value; draw(); };
      $('#gst', root).onchange = (e) => { st.status = e.target.value; draw(); };
      $('#gcat', root).onchange = (e) => { st.cat = e.target.value; draw(); };
      draw();

      const openForm = (g) => {
        const isEdit = !!g;
        const v = g || { title: '', description: '', category: cats[0] ? cats[0].id : '', tags: [], gameUrl: '', status: 'draft', featured: false, order: games.length + 1, thumbnail: '' };
        modal({
          title: isEdit ? 'Edit game' : 'Tambah game', wide: true,
          body: `<form id="gf">${isEdit ? `<p class="muted small">Game ID: <code>${esc(g.id)}</code></p>` : ''}${gameFieldsHtml(v, cats, media)}</form>`,
          footer: `<button class="btn btn-ghost" data-close type="button">Batal</button>
            <button class="btn btn-ghost" id="gSaveDraft" type="button"><i data-lucide="save"></i>Simpan Draft</button>
            ${can('games.publish') ? '<button class="btn btn-primary" id="gPublish" type="button"><i data-lucide="rocket"></i>Simpan & Publish</button>' : ''}`,
          onMount: (m) => {
            const form = m.querySelector('#gf');
            m.querySelector('[data-thumb]').onchange = (e) => { if (e.target.value) form.elements.thumbnail.value = e.target.value; };
            const go = (status, btn) => run(btn, async () => {
              const data = collectGame(form); data.status = status;
              await saveGameData(data, g && g.id);
              toast(status === 'published' ? 'Game dipublish.' : 'Draft game tersimpan.');
              closeModal(); refresh(); return true;
            });
            m.querySelector('#gSaveDraft').onclick = (e) => go('draft', e.currentTarget);
            const pb = m.querySelector('#gPublish'); if (pb) pb.onclick = (e) => go('published', e.currentTarget);
          }
        });
      };

      const move = async (id, dir, btn) => {
        const list = sorted();
        const i = list.findIndex((g) => g.id === id), j = i + dir;
        if (j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        const changes = list.map((g, k) => ({ id: g.id, order: k + 1 })).filter((c) => games.find((x) => x.id === c.id).order !== c.order);
        await run(btn, async () => {
          for (const c of changes) await HG.save('games', c);
          HG.log('Ubah urutan game', list[j].title);
          return true;
        });
        refresh();
      };

      root.onclick = async (e) => {
        const b = e.target.closest('button[data-act]');
        if (!b) return;
        const id = b.dataset.id;
        const g = games.find((x) => x.id === id);
        const act = b.dataset.act;
        if (act === 'new') return openForm(null);
        if (act === 'edit') return openForm(g);
        if (act === 'up') return move(id, -1, b);
        if (act === 'down') return move(id, 1, b);
        if (act === 'toggle') {
          if (g.status === 'published') {
            await run(b, async () => { await HG.save('games', { id, status: 'draft' }); HG.log('Batalkan publikasi', g.title); toast('Game dikembalikan ke draft.'); return true; });
          } else if (!g.gameUrl && !g.entry) {
            toast('Isi Game URL atau upload file game dulu sebelum publish.', 'error');
            return openForm(g);
          } else {
            await run(b, async () => { await HG.save('games', { id, status: 'published' }); HG.log('Publish game', g.title); toast('Game dipublish.'); return true; });
          }
          return refresh();
        }
        if (act === 'del') {
          const ok = await confirmBox(`Hapus "${g.title}" secara permanen? Tindakan ini tidak bisa dibatalkan.`, { title: 'Hapus game', okText: 'Hapus' });
          if (!ok) return;
          await run(b, async () => { await HG.saveGameFiles(id, []); await HG.remove('games', id); HG.log('Hapus game', g.title); toast('Game dihapus.'); return true; });
          refresh();
        }
      };
    }
  };

  // ================= UPLOADER =================
  // ---- Helper file game (dipakai uploader dan dapat diuji terpisah)
  // INLINE-BEGIN
  const BAD_EXT = /\.(php|asp|aspx|jsp|cgi|exe|dll|so|sh|bat|cmd|ps1|jar|py|rb|pl|phtml|htaccess)$/i;
  const TEXT_EXT = /\.(html?|css|m?js|json|txt|svg|md)$/i;
  const ALLOW = /\.(html?|css|m?js|json|txt|svg|png|jpe?g|gif|webp|ico|mp3|ogg|wav|m4a|woff2?|ttf|otf|mp4|webm)$/i;
  const MIME = { html: 'text/html', htm: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', txt: 'text/plain', md: 'text/markdown', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', ico: 'image/x-icon', mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', mp4: 'video/mp4', webm: 'video/webm' };
  const MAX_ZIP = 50 * 1024 * 1024, MAX_FILE = 900 * 1024, MAX_TOTAL = 20 * 1024 * 1024, MAX_FILES = 500;
  const norm = (p) => { const out = []; for (const s of p.split('/')) { if (!s || s === '.') continue; if (s === '..') out.pop(); else out.push(s); } return out.join('/'); };
  const mimeOf = (p) => MIME[(p.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';
  const isJunk = (p) => /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)(\/|$)/.test(p) || /(^|\/)\._/.test(p);
  const isHtml = (p) => /\.html?$/i.test(p);
  function checkPath(p) {
    if (p.includes('\\') || p.startsWith('/') || /^[a-z]:/i.test(p) || p.split('/').includes('..')) return 'Path berbahaya: ' + p;
    if (BAD_EXT.test(p)) return 'Tipe file dilarang: ' + p;
    if (!ALLOW.test(p)) return 'Tipe file tidak diizinkan: ' + p;
    return null;
  }
  // Pilih entry: index.html dulu, lalu satu-satunya HTML, lalu yang paling dangkal.
  function defaultEntry(paths) {
    const htmls = paths.filter(isHtml).sort((a, b) => a.split('/').length - b.split('/').length);
    const idx = htmls.find((p) => /(^|\/)index\.html?$/i.test(p));
    return idx || (htmls.length === 1 ? htmls[0] : (htmls[0] || ''));
  }
  // Gabungkan HTML utama dengan CSS, JS, dan aset yang dirujuk (agar bisa dijalankan dalam satu iframe).
  function inlineHtml(entryPath, files) {
    const dir = entryPath.includes('/') ? entryPath.slice(0, entryPath.lastIndexOf('/') + 1) : '';
    const get = (ref) => {
      if (!ref || /^(https?:|data:|blob:|\/\/|#|mailto:)/i.test(ref)) return null;
      const clean = ref.split('#')[0].split('?')[0];
      return files.get(norm(dir + clean)) || null;
    };
    const esc2 = (s) => s.replace(/<\/script/gi, '<\\/script');
    let html = files.get(entryPath).content;
    html = html.replace(/<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (m, a, src, b) => {
      const f = get(src);
      if (!f || !f.text) return m;
      return '<script' + a + b + '>' + esc2(f.content) + '</script>';
    });
    html = html.replace(/<link\b[^>]*?href=["']([^"']+)["'][^>]*>/gi, (m, href) => {
      const f = get(href);
      if (!f || !/\.css$/i.test(f.path)) return m;
      return '<style>' + f.content + '</style>';
    });
    html = html.replace(/\b(src|href|poster)=(["'])([^"']+)\2/gi, (m, attr, q, ref) => {
      const f = get(ref);
      if (!f) return m;
      const url = f.text ? 'data:' + f.mime + ';charset=utf-8,' + encodeURIComponent(f.content) : f.content;
      return attr + '=' + q + url + q;
    });
    return html;
  }
  // INLINE-END

  const readDataUrl = (f) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error('Gagal membaca ' + f.name));
    r.readAsDataURL(f);
  });
  async function makeEntry(path, content, size) {
    return { path, mime: mimeOf(path), text: TEXT_EXT.test(path), content, size };
  }
  // Dari beberapa File (atau folder). Mengembalikan { errors, entries }.
  async function readFiles(list) {
    const errors = [], entries = [];
    for (const f of list) {
      const rel = f.webkitRelativePath || f.name;
      if (isJunk(rel)) continue;
      if (/\.zip$/i.test(f.name)) { errors.push('ZIP tidak bisa digabung dengan file lain. Upload ZIP sendiri.'); continue; }
      const bad = checkPath(rel);
      if (bad) { errors.push(bad); continue; }
      const text = TEXT_EXT.test(rel);
      const content = text ? await f.text() : await readDataUrl(f);
      if (content.length > MAX_FILE) { errors.push(`${rel} terlalu besar (maks 900 KB per file).`); continue; }
      entries.push(await makeEntry(rel, content, content.length));
      if (entries.length > MAX_FILES) { errors.push('Jumlah file melebihi 500.'); break; }
    }
    return { errors, entries };
  }
  // Dari satu ZIP.
  async function readZip(file) {
    const errors = [], entries = [];
    if (file.size > MAX_ZIP) return { errors: [`ZIP melebihi 50 MB (${(file.size / 1048576).toFixed(1)} MB).`], entries };
    const magic = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    if (!(magic[0] === 0x50 && magic[1] === 0x4b)) return { errors: ['Isi file bukan arsip ZIP yang valid.'], entries };
    if (!window.JSZip) return { errors: ['Library JSZip gagal dimuat. Periksa koneksi internet.'], entries };
    let zip;
    try { zip = await JSZip.loadAsync(file); }
    catch (e) { return { errors: ['ZIP rusak atau tidak bisa dibaca.'], entries }; }
    for (const [name, z] of Object.entries(zip.files)) {
      if (z.dir || isJunk(name)) continue;
      const bad = checkPath(name);
      if (bad) { errors.push(bad); continue; }
      const text = TEXT_EXT.test(name);
      const content = text ? await z.async('string') : 'data:' + mimeOf(name) + ';base64,' + (await z.async('base64'));
      if (content.length > MAX_FILE) { errors.push(`${name} terlalu besar (maks 900 KB per file).`); continue; }
      entries.push(await makeEntry(name, content, content.length));
      if (entries.length > MAX_FILES) { errors.push('Jumlah file melebihi 500.'); break; }
    }
    return { errors, entries };
  }

  views.uploader = {
    async render(root) {
      const [cats, media] = await Promise.all([HG.list('categories'), HG.list('media')]);
      const ACCEPT = '.zip,.html,.htm,.css,.js,.mjs,.json,.txt,.svg,.png,.jpg,.jpeg,.gif,.webp,.ico,.mp3,.ogg,.wav,.m4a,.woff,.woff2,.ttf,.otf,.mp4,.webm';
      const st = { entries: [], entry: '', source: null };
      const total = () => st.entries.reduce((a, e) => a + e.size, 0);
      const fmtKB = (n) => (n >= 1048576 ? (n / 1048576).toFixed(2) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
      const iconFor = (e) => (e.text && /html/.test(e.mime) ? 'file-code' : e.text ? 'file-text' : e.mime.startsWith('image/') ? 'image' : e.mime.startsWith('audio/') ? 'music' : e.mime.startsWith('video/') ? 'film' : 'file');

      root.innerHTML = page('Upload Games', 'Upload game HTML5: satu ZIP, beberapa file sekaligus (HTML, CSS, JS, gambar, audio, font), atau satu folder.') + `
        <div class="card drop" id="drop">
          <i data-lucide="upload-cloud"></i>
          <h3>Seret file ke sini</h3>
          <p class="muted small">Bisa ZIP, atau beberapa file sekaligus</p>
          <div class="page-actions" style="justify-content:center">
            <label class="btn btn-primary"><input type="file" id="fileIn" multiple accept="${ACCEPT}" hidden>Pilih file</label>
            <label class="btn btn-ghost"><input type="file" id="dirIn" webkitdirectory hidden>Pilih folder</label>
          </div>
          <small class="muted">ZIP maks 50 MB · tiap file maks 900 KB · total maks 20 MB · tanpa skrip server</small>
        </div>
        <div id="stage"></div>`;

      const stage = () => $('#stage', root);
      const build = () => {
        stage().innerHTML = `<div class="uploader-grid">
          <div class="card"><div class="card-head"><h2>Preview</h2>${demoChip.replace('DEMO', 'PREVIEW')}</div><div id="pvWrap"></div>
            <p class="muted small" style="margin-top:8px">Preview menggabungkan HTML, CSS, dan JS dari file yang diupload. Aset yang dimuat lewat JavaScript mungkin tidak tampil di preview.</p></div>
          <div class="card">
            <div class="card-head"><h2>File game</h2><span class="muted small" id="sumTxt"></span></div>
            <label>Halaman utama (entry)<select id="entrySel"></select></label>
            <div class="flist" id="flist" style="margin-top:8px"></div>
            <div id="issues"></div>
            <div class="card-head" style="margin-top:14px"><h2>Metadata game</h2></div>
            <form id="upForm">${gameFieldsHtml({ status: 'draft', order: 0 }, cats, media)}</form>
            <div class="page-actions" style="margin-top:12px;justify-content:flex-end">
              <button class="btn btn-ghost" id="upDraft" type="button"><i data-lucide="save"></i>Save Draft</button>
              <button class="btn btn-primary" id="upPub" type="button"><i data-lucide="rocket"></i>Publish game</button>
            </div></div></div>`;
        $('[data-thumb]', root).onchange = (e) => { if (e.target.value) $('#upForm', root).elements.thumbnail.value = e.target.value; };
        $('#entrySel', root).onchange = (e) => { st.entry = e.target.value; drawPreview(); };
        $('#flist', root).onclick = (e) => {
          const b = e.target.closest('button[data-rm]'); if (!b) return;
          const removed = st.entries.splice(+b.dataset.rm, 1)[0];
          if (removed && removed.path === st.entry) st.entry = '';
          drawFiles();
        };
        $('#upDraft', root).onclick = (e) => save('draft', e.currentTarget);
        $('#upPub', root).onclick = (e) => save('published', e.currentTarget);
      };
      const drawFiles = () => {
        if (!st.entries.length) { stage().innerHTML = ''; return; }
        if (!$('#upForm', root)) build();
        const paths = st.entries.map((e) => e.path);
        if (!st.entry || !paths.includes(st.entry)) st.entry = defaultEntry(paths);
        const htmls = paths.filter(isHtml);
        $('#entrySel', root).innerHTML = htmls.length
          ? htmls.map((p) => `<option value="${esc(p)}" ${p === st.entry ? 'selected' : ''}>${esc(p)}</option>`).join('')
          : '<option value="">Tidak ada file HTML</option>';
        $('#flist', root).innerHTML = st.entries.map((e, i) => `<div class="list-row">
            <i data-lucide="${iconFor(e)}"></i>
            <div class="grow"><b>${esc(e.path)}</b><small>${esc(e.mime)} · ${fmtKB(e.size)}</small></div>
            <button class="btn-icon danger" data-rm="${i}" type="button" aria-label="Hapus file"><i data-lucide="x"></i></button></div>`).join('');
        $('#sumTxt', root).textContent = `${st.entries.length} file · ${fmtKB(total())}`;
        const issues = [];
        if (!st.entry) issues.push('Pilih halaman utama (file .html) dulu.');
        if (total() > MAX_TOTAL) issues.push('Total ukuran melebihi 20 MB. Hapus file yang tidak perlu.');
        $('#issues', root).innerHTML = issues.length ? `<ul class="issues warn" style="margin-top:10px">${issues.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
        drawPreview();
        icons();
      };
      const drawPreview = () => {
        const wrap = $('#pvWrap', root);
        if (!st.entry) { wrap.innerHTML = '<p class="muted">Pilih halaman utama untuk melihat preview.</p>'; return; }
        const files = new Map(st.entries.map((e) => [e.path, e]));
        wrap.innerHTML = '<iframe class="preview-frame" title="Preview game" sandbox="allow-scripts" style="height:440px"></iframe>';
        wrap.querySelector('iframe').srcdoc = inlineHtml(st.entry, files);
      };
      const addEntries = (incoming, replace) => {
        const map = new Map(replace ? [] : st.entries.map((e) => [e.path, e]));
        for (const e of incoming) map.set(e.path, e);
        st.entries = [...map.values()];
      };
      const ingest = async (list, isZip) => {
        stage().innerHTML = '<div class="card pad"><div class="sk" style="height:56px"></div><p class="muted small" style="margin-top:10px">Membaca file…</p></div>';
        try {
          const r = isZip ? await readZip(list[0]) : await readFiles(list);
          if (r.errors.length) {
            stage().innerHTML = `<div class="card pad"><h2>Validasi gagal</h2><p class="muted small" style="margin:6px 0 10px">Perbaiki atau hapus file berikut lalu upload ulang.</p><ul class="issues err">${r.errors.slice(0, 20).map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>`;
            if (!st.entries.length) return;
            return drawFiles();
          }
          if (!r.entries.length) { stage().innerHTML = ''; return toast('Tidak ada file yang bisa dibaca.', 'error'); }
          addEntries(r.entries, isZip);
          st.source = isZip ? { kind: 'zip', name: list[0].name } : { kind: 'files', name: list.length + ' file' };
          st.entry = isZip ? '' : st.entry;
          drawFiles();
        } catch (e) {
          stage().innerHTML = `<div class="card pad"><h2>Gagal membaca file</h2><p class="muted small">${esc(e.message)}</p></div>`;
        }
      };
      const onPick = (input) => {
        const list = [...input.files];
        input.value = '';
        if (!list.length) return;
        const isZip = list.length === 1 && /\.zip$/i.test(list[0].name);
        if (!isZip && list.some((f) => /\.zip$/i.test(f.name))) { toast('ZIP harus diupload sendiri.', 'error'); return; }
        ingest(list, isZip);
      };
      const save = (status, btn) => run(btn, async () => {
        if (!st.entry) throw new Error('Pilih halaman utama (file HTML) dulu.');
        if (total() > MAX_TOTAL) throw new Error('Total ukuran melebihi 20 MB.');
        const data = collectGame($('#upForm', root));
        data.status = status;
        if (!data.title) data.title = st.source && st.source.kind === 'zip' ? st.source.name.replace(/\.zip$/i, '') : 'Game baru';
        const rec = await saveGameData(data, null, {
          entry: st.entry, fileCount: st.entries.length, bytes: total(),
          archive: st.source ? { kind: st.source.kind, name: st.source.name } : null
        });
        try { await HG.saveGameFiles(rec.id, st.entries); }
        catch (e) { await HG.remove('games', rec.id).catch(() => {}); throw new Error('File game gagal disimpan: ' + e.message); }
        toast(status === 'published' ? 'Game dipublish.' : 'Game disimpan sebagai draft.');
        location.hash = '#/games';
        return true;
      });

      const fileIn = $('#fileIn', root), dirIn = $('#dirIn', root), drop = $('#drop', root);
      fileIn.onchange = () => onPick(fileIn);
      dirIn.onchange = () => onPick(dirIn);
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('hot'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('hot'));
      drop.addEventListener('drop', (e) => {
        e.preventDefault(); drop.classList.remove('hot');
        const list = [...e.dataTransfer.files];
        if (!list.length) return;
        const isZip = list.length === 1 && /\.zip$/i.test(list[0].name);
        ingest(list, isZip);
      });
    }
  };

  // ================= CATEGORIES =================
  views.categories = {
    async render(root) {
      const [cats, games] = await Promise.all([HG.list('categories'), HG.list('games')]);
      const sorted = () => [...cats].sort(byOrder);
      root.innerHTML = page('Categories', 'Kelola kategori game. Kategori yang disembunyikan tidak tampil di website.', can('categories') ? `<button class="btn btn-primary" data-act="new" type="button"><i data-lucide="plus"></i>Tambah kategori</button>` : '') + `
        <div class="card table-wrap"><table class="table"><thead><tr><th>Kategori</th><th>Slug</th><th>Game</th><th>Urutan</th><th>Tampil</th><th></th></tr></thead><tbody id="cbody"></tbody></table></div>`;
      const draw = () => {
        const list = sorted();
        $('#cbody', root).innerHTML = list.map((c, i) => {
          const n = games.filter((g) => g.category === c.id).length;
          return `<tr><td><span class="cat-dot" style="background:${esc(c.color)}"></span><b>${esc(c.name)}</b></td><td><code>${esc(c.slug)}</code></td><td>${n}</td>
            <td><div class="actions" style="justify-content:flex-start"><button class="btn-icon" data-act="up" data-id="${c.id}" type="button" aria-label="Naik" ${i === 0 ? 'disabled' : ''}><i data-lucide="arrow-up"></i></button><button class="btn-icon" data-act="down" data-id="${c.id}" type="button" aria-label="Turun" ${i === list.length - 1 ? 'disabled' : ''}><i data-lucide="arrow-down"></i></button><span class="muted">${c.order}</span></div></td>
            <td><label class="switch"><input type="checkbox" data-act="vis" data-id="${c.id}" ${c.visible ? 'checked' : ''}><span></span></label></td>
            <td><div class="actions">
              <button class="btn-icon" data-act="edit" data-id="${c.id}" type="button" aria-label="Edit"><i data-lucide="pencil"></i></button>
              <button class="btn-icon danger" data-act="del" data-id="${c.id}" type="button" aria-label="Hapus"><i data-lucide="trash-2"></i></button>
            </div></td></tr>`;
        }).join('') || `<tr><td colspan="6">${empty('tags', 'Belum ada kategori', 'Tambahkan kategori pertama.')}</td></tr>`;
        icons();
      };
      const openForm = (c) => modal({
        title: c ? 'Edit kategori' : 'Tambah kategori',
        body: `<form id="cf" class="field-grid">
          <label class="full">Nama<input name="name" required maxlength="40" value="${esc(c ? c.name : '')}"></label>
          <label>Warna<div class="cat-field"><input type="color" name="color" value="${safeColor(c ? c.color : '', '#657DFF')}"></div></label>
          <label>Urutan<input name="order" type="number" min="0" value="${c ? c.order : cats.length + 1}"></label>
          <label class="check full"><input type="checkbox" name="visible" ${!c || c.visible ? 'checked' : ''}> Tampilkan di website</label></form>`,
        footer: `<button class="btn btn-ghost" data-close type="button">Batal</button><button class="btn btn-primary" id="cSave" type="button">Simpan</button>`,
        onMount: (m) => {
          m.querySelector('#cSave').onclick = (e) => run(e.currentTarget, async () => {
            const f = m.querySelector('#cf').elements;
            const name = f.name.value.trim();
            if (!name) throw new Error('Nama wajib diisi.');
            const slug = HG.slugify(name);
            if (cats.some((x) => x.slug === slug && (!c || x.id !== c.id))) throw new Error('Kategori dengan nama itu sudah ada.');
            await HG.save('categories', { ...(c ? { id: c.id } : {}), name, slug, color: f.color.value, order: Number(f.order.value) || 0, visible: f.visible.checked });
            HG.log(c ? 'Update kategori' : 'Tambah kategori', name);
            toast('Kategori tersimpan.'); closeModal(); refresh(); return true;
          });
        }
      });
      root.onclick = async (e) => {
        const b = e.target.closest('button[data-act]');
        if (!b) return;
        const c = cats.find((x) => x.id === b.dataset.id);
        const act = b.dataset.act;
        if (act === 'new') return openForm(null);
        if (act === 'edit') return openForm(c);
        if (act === 'up' || act === 'down') {
          const list = sorted(); const i = list.findIndex((x) => x.id === c.id); const j = i + (act === 'up' ? -1 : 1);
          if (j < 0 || j >= list.length) return;
          [list[i], list[j]] = [list[j], list[i]];
          await run(b, async () => { for (const [k, x] of list.entries()) if (x.order !== k + 1) await HG.save('categories', { id: x.id, order: k + 1 }); HG.log('Ubah urutan kategori', c.name); return true; });
          return refresh();
        }
        if (act === 'del') {
          const used = games.filter((g) => g.category === c.id).length;
          if (used) return toast(`Kategori masih dipakai ${used} game. Pindahkan game dulu.`, 'error');
          const ok = await confirmBox(`Hapus kategori "${c.name}"?`, { title: 'Hapus kategori', okText: 'Hapus' });
          if (!ok) return;
          await run(b, async () => { await HG.remove('categories', c.id); HG.log('Hapus kategori', c.name); toast('Kategori dihapus.'); return true; });
          refresh();
        }
      };
      root.onchange = async (e) => {
        const t = e.target;
        if (t.dataset.act !== 'vis') return;
        const c = cats.find((x) => x.id === t.dataset.id);
        await run(null, async () => { await HG.save('categories', { id: c.id, visible: t.checked }); HG.log(t.checked ? 'Tampilkan kategori' : 'Sembunyikan kategori', c.name); toast('Visibilitas diperbarui.'); return true; });
        refresh();
      };
      draw();
    }
  };

  // ================= HOMEPAGE BUILDER =================
  views.homepage = {
    async render(root) {
      const ctx = await siteCtx();
      const { draft } = ctx;
      const renumber = () => { draft.sections.sort(byOrder); draft.sections.forEach((s, i) => (s.order = i + 1)); };
      root.innerHTML = page('Homepage Builder', 'Atur section beranda: tambah, sembunyikan, urutkan, dan edit.',
        `<button class="btn btn-ghost" id="addSec" type="button"><i data-lucide="plus"></i>Tambah section</button>`) + siteBar() + `
        <div class="split">
          <section class="card"><div class="card-head"><h2>Section beranda</h2><span class="muted small">Seret untuk mengurutkan · di layar sentuh pakai panah</span></div><div id="secList" class="sec-list"></div></section>
          <section class="card preview-card"><div class="card-head"><h2>Live preview</h2>${demoChip}</div><iframe id="live" class="preview-frame" title="Live preview" sandbox=""></iframe></section>
        </div>`;
      const refreshLive = () => { $('#live', root).srcdoc = previewHtml(draft, ctx.games, ctx.cats); };
      const ctrl = bindSiteBar(root, draft, { ...ctx, onChange: refreshLive });
      let dragFrom = null;
      const draw = () => {
        $('#secList', root).innerHTML = draft.sections.map((s, i) => `<div class="sec-row ${s.enabled ? '' : 'off'}" draggable="true" data-i="${i}">
            <i data-lucide="grip-vertical" class="grip"></i>
            <div class="sec-info"><b>${esc(s.title)}</b><small class="muted">${esc((HG.SECTION_TYPES.find((t) => t.type === s.type) || { title: s.type }).title)}${['featured', 'trending', 'recent', 'categories', 'recommended'].includes(s.type) ? ' · ' + s.limit + ' item' : ''}</small></div>
            <label class="switch" title="Tampilkan / sembunyikan"><input type="checkbox" data-en="${i}" ${s.enabled ? 'checked' : ''}><span></span></label>
            <button class="btn-icon" data-up="${i}" type="button" aria-label="Naik" ${i === 0 ? 'disabled' : ''}><i data-lucide="arrow-up"></i></button>
            <button class="btn-icon" data-down="${i}" type="button" aria-label="Turun" ${i === draft.sections.length - 1 ? 'disabled' : ''}><i data-lucide="arrow-down"></i></button>
            <button class="btn-icon" data-edit="${i}" type="button" aria-label="Edit"><i data-lucide="pencil"></i></button>
            <button class="btn-icon danger" data-del="${i}" type="button" aria-label="Hapus"><i data-lucide="trash-2"></i></button>
          </div>`).join('') || empty('layout-template', 'Belum ada section', 'Tambahkan section untuk membangun beranda.');
        icons();
      };
      const after = () => { renumber(); draw(); refreshLive(); ctrl.changed(); };
      const sectionForm = (s, isNew) => {
        const typeOpts = HG.SECTION_TYPES.map((t) => `<option value="${t.type}">${esc(t.title)}</option>`).join('');
        modal({
          title: isNew ? 'Tambah section' : 'Edit section',
          body: `<form id="secForm" class="field-grid">
            ${isNew ? `<label class="full">Jenis section<select name="type">${typeOpts}</select></label>` : ''}
            <label class="full">Judul tampil<input name="title" maxlength="50" value="${esc(s ? s.title : '')}" required></label>
            <label>Jumlah item<input name="limit" type="number" min="1" max="24" value="${s ? s.limit : 8}"></label>
            <label class="check"><input type="checkbox" name="enabled" ${!s || s.enabled ? 'checked' : ''}> Tampilkan</label></form>`,
          footer: `<button class="btn btn-ghost" data-close type="button">Batal</button><button class="btn btn-primary" id="secSave" type="button">${isNew ? 'Tambah' : 'Simpan'}</button>`,
          onMount: (m) => {
            m.querySelector('#secSave').onclick = () => {
              const f = m.querySelector('#secForm').elements;
              const title = f.title.value.trim();
              if (!title) return toast('Judul wajib diisi.', 'error');
              const limit = Math.min(24, Math.max(1, Number(f.limit.value) || 8));
              if (isNew) {
                const type = f.type.value;
                draft.sections.push({ id: 'sec-' + type + '-' + Date.now().toString(36), type, title, enabled: true, order: 999, limit });
              } else {
                Object.assign(s, { title, limit, enabled: f.enabled.checked });
              }
              closeModal(); after();
              toast(isNew ? 'Section ditambahkan ke draft.' : 'Section diperbarui.');
            };
          }
        });
      };
      $('#addSec', root).onclick = () => sectionForm(null, true);
      const list = $('#secList', root);
      list.onclick = async (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        const ds = b.dataset;
        if (ds.up !== undefined) { const i = +ds.up; [draft.sections[i - 1], draft.sections[i]] = [draft.sections[i], draft.sections[i - 1]]; return after(); }
        if (ds.down !== undefined) { const i = +ds.down; [draft.sections[i + 1], draft.sections[i]] = [draft.sections[i], draft.sections[i + 1]]; return after(); }
        if (ds.edit !== undefined) return sectionForm(draft.sections[+ds.edit], false);
        if (ds.del !== undefined) {
          const s = draft.sections[+ds.del];
          const ok = await confirmBox(`Hapus section "${s.title}" dari beranda?`, { title: 'Hapus section', okText: 'Hapus' });
          if (!ok) return;
          draft.sections.splice(+ds.del, 1); return after();
        }
      };
      list.onchange = (e) => {
        const t = e.target;
        if (t.dataset.en === undefined) return;
        draft.sections[+t.dataset.en].enabled = t.checked;
        after();
      };
      list.addEventListener('dragstart', (e) => {
        const row = e.target.closest('.sec-row'); if (!row) return;
        dragFrom = +row.dataset.i; row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragFrom));
      });
      list.addEventListener('dragend', () => { $$('.sec-row', list).forEach((r) => r.classList.remove('dragging', 'over')); });
      list.addEventListener('dragover', (e) => {
        e.preventDefault();
        const row = e.target.closest('.sec-row'); if (!row) return;
        $$('.sec-row', list).forEach((r) => r.classList.toggle('over', r === row));
      });
      list.addEventListener('drop', (e) => {
        e.preventDefault();
        const row = e.target.closest('.sec-row');
        if (!row || dragFrom === null) return;
        const to = +row.dataset.i;
        if (to !== dragFrom) { const [moved] = draft.sections.splice(dragFrom, 1); draft.sections.splice(to, 0, moved); after(); }
        dragFrom = null;
      });
      renumber(); draw(); refreshLive();
    }
  };

  // ================= APPEARANCE (WEBSITE CUSTOMIZER) =================
  views.appearance = {
    async render(root) {
      const ctx = await siteCtx();
      const { draft } = ctx;
      const s = draft.settings;
      const refreshLive = () => { $('#live', root).srcdoc = previewHtml(draft, ctx.games, ctx.cats); };
      const fontOpts = HG.FONTS.map((f) => `<option value="${f}">${f}</option>`).join('');
      root.innerHTML = page('Website Customizer', 'Atur tampilan website tanpa mengedit kode. Perubahan tampil ke publik setelah PUBLISH CHANGES.') + siteBar() + `
        <div class="split">
          <div class="stack" style="gap:14px">
            <section class="card"><div class="section-title"><h2>Hero</h2></div>
              <div class="field-grid">
                <label class="full">Judul hero<input data-k="heroTitle" maxlength="60"></label>
                <label class="full">Subjudul<input data-k="heroSubtitle" maxlength="140"></label>
                <label>Teks tombol<input data-k="heroButtonText" maxlength="24"></label>
                <label>Tujuan tombol<input data-k="heroButtonLink" placeholder="#games atau https://…"></label>
                <label class="full">Banner image URL
                  <div class="pick-row"><input data-k="heroBannerUrl" placeholder="https://…"><select data-pick="heroBannerUrl"><option value="">Pilih media…</option>${mediaOpts(ctx.media, ['banner'])}</select></div>
                </label>
              </div></section>
            <section class="card"><div class="section-title"><h2>Logo</h2></div>
              <label>Logo URL<div class="pick-row"><input data-k="logoUrl" placeholder="https://…"><select data-pick="logoUrl"><option value="">Pilih media…</option>${mediaOpts(ctx.media, ['logo'])}</select></div></label></section>
            <section class="card"><div class="section-title"><h2>Warna</h2></div>
              <div class="field-grid">
                <label>Background<input type="color" data-k="bgColor"></label>
                <label>Accent<input type="color" data-k="accent"></label>
                <label>Accent secondary<input type="color" data-k="accent2"></label>
              </div></section>
            <section class="card"><div class="section-title"><h2>Typography & spacing</h2></div>
              <div class="field-grid">
                <label>Font<select data-k="font">${fontOpts}</select></label>
                <label>Spacing<select data-k="spacing"><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select></label>
              </div></section>
            <section class="card"><div class="section-title"><h2>Game cards</h2></div>
              <label>Kartu per baris: <b id="cpr">${s.cardsPerRow}</b><input type="range" min="2" max="6" data-k="cardsPerRow"></label></section>
            <section class="card"><div class="section-title"><h2>Footer</h2></div>
              <label>Teks footer<input data-k="footerText" maxlength="120"></label></section>
          </div>
          <section class="card preview-card"><div class="card-head"><h2>Live preview</h2>${demoChip}</div><iframe id="live" class="preview-frame" title="Live preview" sandbox=""></iframe></section>
        </div>`;
      const ctrl = bindSiteBar(root, draft, { ...ctx, onChange: () => { $('#cpr', root).textContent = draft.settings.cardsPerRow; refreshLive(); } });
      bindFields(root, draft.settings, ctrl.changed);
      bindPickers(root);
      refreshLive();
    }
  };

  // ================= MEDIA LIBRARY =================
  async function compressImage(file) {
    if (file.type === 'image/svg+xml') {
      const txt = await file.text();
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt);
      return { url, type: 'image/svg+xml', w: 0, h: 0 };
    }
    const img = await new Promise((res, rej) => {
      const i = new Image();
      const src = URL.createObjectURL(file);
      i.onload = () => { res(i); };
      i.onerror = () => rej(new Error('Gambar tidak bisa dibaca: ' + file.name));
      i.src = src;
    });
    const max = 1280, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(img.src);
    let url = c.toDataURL('image/webp', 0.85);
    if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/jpeg', 0.85);
    return { url, type: url.slice(5, url.indexOf(';')), w: c.width, h: c.height };
  }

  views.media = {
    async render(root, q) {
      const st = { search: q.q || '', kind: 'all' };
      let media = await HG.list('media');
      const usage = () => { const u = HG.storageUsage(); return `${(u.used / 1048576).toFixed(2)} MB dari ${(u.quota / 1048576).toFixed(1)} MB dipakai · aset media ${(u.media / 1048576).toFixed(2)} MB`; };
      root.innerHTML = page('Media Library', 'Upload, cari, dan kelola gambar untuk thumbnail, banner, dan logo.',
        `<label class="btn btn-primary"><input type="file" id="mIn" accept="image/*" multiple hidden><i data-lucide="upload"></i>Upload gambar</label>`) + `
        <div class="card"><div class="card-head"><div><h2>Storage usage</h2><span class="muted small" id="usageTxt"></span></div>${demoChip}</div><div class="usage"><i id="usageBar"></i></div></div>
        <div class="toolbar">
          <div class="search"><i data-lucide="search"></i><input id="mq" type="search" placeholder="Cari nama file" value="${esc(st.search)}"></div>
          <div class="seg" id="mKind">${['all', 'thumbnail', 'banner', 'logo'].map((k) => `<button data-k="${k}" class="${k === 'all' ? 'on' : ''}" type="button">${k === 'all' ? 'Semua' : k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>
        </div>
        <div id="mGrid" class="media-grid"></div>`;
      const draw = () => {
        const u = HG.storageUsage();
        $('#usageTxt', root).textContent = usage();
        $('#usageBar', root).style.width = Math.min(100, (u.used / u.quota) * 100).toFixed(1) + '%';
        const list = media.filter((m) => (!st.search || m.name.toLowerCase().includes(st.search.toLowerCase())) && (st.kind === 'all' || m.kind === st.kind));
        $('#mGrid', root).innerHTML = list.map((m) => `<div class="media-item">
            <div class="pv">${m.type.startsWith('image/') ? `<img loading="lazy" alt="${esc(m.name)}" src="${m.url}">` : '<i data-lucide="file"></i>'}</div>
            <div class="meta"><b title="${esc(m.name)}">${esc(m.name)}</b><small>${esc(m.kind)} · ${(m.size / 1024).toFixed(0)} KB</small></div>
            <div class="acts">
              <button class="btn-icon" data-act="view" data-id="${m.id}" type="button" aria-label="Preview"><i data-lucide="eye"></i></button>
              <button class="btn-icon" data-act="rename" data-id="${m.id}" type="button" aria-label="Rename"><i data-lucide="pencil"></i></button>
              <button class="btn-icon danger" data-act="del" data-id="${m.id}" type="button" aria-label="Hapus"><i data-lucide="trash-2"></i></button>
            </div></div>`).join('') || `<div style="grid-column:1/-1">${empty('image', 'Belum ada media', 'Upload gambar untuk thumbnail, banner, atau logo.')}</div>`;
        icons();
      };
      $('#mq', root).oninput = (e) => { st.search = e.target.value; draw(); };
      $('#mKind', root).onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return;
        st.kind = b.dataset.k;
        $$('#mKind button', root).forEach((x) => x.classList.toggle('on', x === b));
        draw();
      };
      const kindFor = () => { const k = st.kind === 'all' ? 'thumbnail' : st.kind; return k; };
      $('#mIn', root).onchange = async (e) => {
        const files = [...e.target.files];
        for (const f of files) {
          try {
            if (!f.type.startsWith('image/')) throw new Error(f.name + ': bukan gambar.');
            const c = await compressImage(f);
            const u = HG.storageUsage();
            if (HG.mode === 'demo' && u.used + c.url.length > u.quota) throw new Error('Penyimpanan demo penuh. Hapus media dulu.');
            if (HG.mode === 'firebase' && c.url.length > 700000) throw new Error('Gambar terlalu besar untuk Firestore (maks ±700 KB). Kecilkan gambar dulu; upload via Storage butuh plan Blaze.');
            const rec = await HG.save('media', { name: f.name.replace(/\.[^.]+$/, '') + '.' + c.type.split('/')[1].replace('+xml', ''), kind: kindFor(), type: c.type, url: c.url, size: c.url.length, width: c.w, height: c.h });
            media.push(rec);
            HG.log('Upload media', rec.name);
            toast('Diupload: ' + rec.name);
          } catch (err) { toast(err.message, 'error'); }
        }
        e.target.value = '';
        draw();
      };
      const openView = (m) => modal({
        title: 'Detail media', wide: true,
        body: `<div class="thumb-lg">${m.type.startsWith('image/') ? `<img alt="${esc(m.name)}" src="${m.url}">` : ''}</div>
          <div class="kv"><span>Nama</span><b>${esc(m.name)}</b><span>Tipe</span><b>${esc(m.type)}</b><span>Ukuran</span><b>${(m.size / 1024).toFixed(1)} KB</b>
          <span>Dimensi</span><b>${m.width ? m.width + '×' + m.height : 'vektor'}</b><span>Kind</span><b>${esc(m.kind)}</b><span>Diupload</span><b>${dt(m.createdAt)}</b><span>ID</span><b><code>${esc(m.id)}</code></b></div>`,
        footer: `<button class="btn btn-ghost" id="copyUrl" type="button"><i data-lucide="copy"></i>Salin URL</button><button class="btn btn-ghost" data-close type="button">Tutup</button>`,
        onMount: (mm) => {
          mm.querySelector('#copyUrl').onclick = async () => {
            try { await navigator.clipboard.writeText(m.url.length > 200 ? m.url.slice(0, 200) + '…' : m.url); toast('URL disalin (versi pendek untuk demo).', 'info'); }
            catch (e) { toast('Clipboard tidak tersedia.', 'error'); }
          };
        }
      });
      root.onclick = async (e) => {
        const b = e.target.closest('button[data-act]'); if (!b) return;
        const m = media.find((x) => x.id === b.dataset.id); if (!m) return;
        if (b.dataset.act === 'view') return openView(m);
        if (b.dataset.act === 'rename') {
          modal({
            title: 'Rename media',
            body: `<form id="rf" class="stack"><label>Nama baru<input name="n" required maxlength="80" value="${esc(m.name)}"></label></form>`,
            footer: `<button class="btn btn-ghost" data-close type="button">Batal</button><button class="btn btn-primary" id="rSave" type="button">Simpan</button>`,
            onMount: (mm) => { mm.querySelector('#rSave').onclick = (ev) => run(ev.currentTarget, async () => {
              const n = mm.querySelector('#rf').elements.n.value.trim(); if (!n) throw new Error('Nama tidak boleh kosong.');
              await HG.save('media', { id: m.id, name: n }); HG.log('Rename media', n); toast('Nama diperbarui.'); closeModal(); refresh(); return true; }); }
          });
        }
        if (b.dataset.act === 'del') {
          const ok = await confirmBox(`Hapus "${m.name}"? Game/banner yang masih memakai URL ini akan kehilangan gambarnya.`, { title: 'Hapus media', okText: 'Hapus' });
          if (!ok) return;
          await run(b, async () => { await HG.remove('media', m.id); HG.log('Hapus media', m.name); toast('Media dihapus.'); return true; });
          refresh();
        }
      };
      draw();
    }
  };

  // ================= USERS =================
  views.users = {
    async render(root, q) {
      const me = HG.me();
      const st = { search: q.q || '', role: 'all' };
      const users = await HG.list('users');
      const roles = can('users.roles') ? ['player', 'editor', 'admin', 'super_admin'] : ['player', 'editor', 'admin'];
      const supers = () => users.filter((u) => u.role === 'super_admin' && u.status === 'active').length;
      const mayTouch = (u) => can('users.roles') || u.role !== 'super_admin';
      root.innerHTML = page('User Management', 'Kelola akun, status, dan role. Role dibatasi oleh izin masing-masing admin.',
        can('users.manage') && HG.mode === 'demo' ? `<button class="btn btn-primary" id="addAdmin" type="button"><i data-lucide="user-plus"></i>Tambah akun admin</button>` : '') + `
        <div class="toolbar">
          <div class="search"><i data-lucide="search"></i><input id="uq" type="search" placeholder="Cari nama atau email" value="${esc(st.search)}"></div>
          <select id="urole"><option value="all">Semua role</option>${Object.keys(HG.ROLE_LABEL).map((r) => `<option value="${r}">${HG.ROLE_LABEL[r]}</option>`).join('')}</select>
        </div>
        <div class="card table-wrap"><table class="table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Terdaftar</th><th>Login terakhir</th><th></th></tr></thead><tbody id="ubody"></tbody></table></div>
        <section class="card"><div class="card-head"><h2>Permission matrix</h2><span class="muted small">Role dipisah: Super Admin · Admin · Editor</span></div><div id="pm" class="table-wrap"></div></section>`;

      const draw = () => {
        const list = users.filter((u) => (!st.search || (u.name + ' ' + u.email).toLowerCase().includes(st.search.toLowerCase())) && (st.role === 'all' || u.role === st.role));
        $('#ubody', root).innerHTML = list.map((u) => {
          const locked = !mayTouch(u) || u.id === me.id;
          return `<tr>
            <td><div class="title-cell"><span class="avatar">${esc(u.name[0])}</span><div style="min-width:0"><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div></div></td>
            <td>${can('users.manage') && !locked && (roles.includes(u.role) || u.role === 'super_admin')
              ? `<select data-role="${u.id}" style="width:auto;min-width:130px">${roles.map((r) => `<option value="${r}" ${r === u.role ? 'selected' : ''}>${HG.ROLE_LABEL[r]}</option>`).join('')}</select>`
              : badge(HG.ROLE_LABEL[u.role])}</td>
            <td><label class="switch" title="${u.status === 'active' ? 'Aktif' : 'Suspended'}"><input type="checkbox" data-status="${u.id}" ${u.status === 'active' ? 'checked' : ''} ${locked || !can('users.manage') ? 'disabled' : ''}><span></span></label></td>
            <td class="muted">${dt(u.createdAt)}</td>
            <td class="muted">${ago(u.lastLogin)}</td>
            <td><div class="actions"><button class="btn-icon" data-view="${u.id}" type="button" aria-label="Lihat profil"><i data-lucide="user-round"></i></button></div></td></tr>`;
        }).join('') || `<tr><td colspan="6">${empty('users', 'Tidak ada user', 'Coba ubah pencarian atau filter role.')}</td></tr>`;
        icons();
      };
      const reRole = (id) => `${id}`;
      $('#uq', root).oninput = (e) => { st.search = e.target.value; draw(); };
      $('#urole', root).onchange = (e) => { st.role = e.target.value; draw(); };
      $('#pm', root).innerHTML = (() => {
        const all = [...new Set(Object.values(HG.PERMS).flat())];
        const rs = ['super_admin', 'admin', 'editor'];
        return `<table class="table"><thead><tr><th>Permission</th>${rs.map((r) => `<th>${HG.ROLE_LABEL[r]}</th>`).join('')}</tr></thead><tbody>${all.map((p) => `<tr><td><code>${p}</code></td>${rs.map((r) => `<td>${HG.PERMS[r].includes(p) ? '<i data-lucide="check" class="ok-ic"></i>' : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      })();

      root.onchange = async (e) => {
        const t = e.target;
        if (t.dataset.role) {
          const u = users.find((x) => x.id === t.dataset.role);
          const next = t.value;
          if (!can('users.roles') && (next === 'super_admin' || u.role === 'super_admin')) { toast('Hanya Super Admin yang bisa mengubah role Super Admin.', 'error'); t.value = u.role; return; }
          if (u.role === 'super_admin' && next !== 'super_admin' && supers() <= 1) { toast('Minimal harus ada satu Super Admin aktif.', 'error'); t.value = u.role; return; }
          await run(null, async () => { await HG.save('users', { id: u.id, role: next }); HG.log('Ubah role', `${u.name} → ${HG.ROLE_LABEL[next]}`); toast('Role diperbarui.'); return true; });
          return refresh();
        }
        if (t.dataset.status) {
          const u = users.find((x) => x.id === t.dataset.status);
          const next = t.checked ? 'active' : 'suspended';
          if (next === 'suspended' && u.role === 'super_admin' && supers() <= 1) { toast('Minimal harus ada satu Super Admin aktif.', 'error'); t.checked = true; return; }
          await run(null, async () => { await HG.save('users', { id: u.id, status: next }); HG.log(next === 'active' ? 'Aktifkan user' : 'Suspend user', u.name); toast('Status diperbarui.'); return true; });
          return refresh();
        }
      };
      root.onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.view) {
          const u = users.find((x) => x.id === b.dataset.view);
          modal({
            title: 'Profil user',
            body: `<div class="card-head" style="margin:0"><div class="title-cell"><span class="avatar" style="width:44px;height:44px;font-size:17px">${esc(u.name[0])}</span><div><b style="font-size:15px">${esc(u.name)}</b><br><small class="muted">${esc(u.email)}</small></div></div>${badge(HG.ROLE_LABEL[u.role])}</div>
              <div class="kv"><span>Status</span><b>${u.status === 'active' ? 'Aktif' : 'Suspended'}</b><span>Terdaftar</span><b>${dt(u.createdAt)}</b><span>Login terakhir</span><b>${ago(u.lastLogin)}</b><span>ID</span><b><code>${esc(u.id)}</code></b></div>`,
            footer: `<button class="btn btn-ghost" data-close type="button">Tutup</button>`
          });
        }
        if (b.id === 'addAdmin') {
          modal({
            title: 'Tambah akun admin',
            body: `<form id="af" class="field-grid">
              <label class="full">Nama<input name="name" required maxlength="60"></label>
              <label class="full">Email<input name="email" type="email" required></label>
              <label>Kata sandi awal<input name="password" type="password" minlength="6" required></label>
              <label>Role<select name="role">${roles.filter((r) => r !== 'player').map((r) => `<option value="${r}">${HG.ROLE_LABEL[r]}</option>`).join('')}</select></label></form>`,
            footer: `<button class="btn btn-ghost" data-close type="button">Batal</button><button class="btn btn-primary" id="aSave" type="button">Buat akun</button>`,
            onMount: (m) => { m.querySelector('#aSave').onclick = (ev) => run(ev.currentTarget, async () => {
              const f = m.querySelector('#af').elements;
              const email = f.email.value.trim().toLowerCase();
              if (users.some((x) => x.email.toLowerCase() === email)) throw new Error('Email sudah terdaftar.');
              await HG.save('users', { name: f.name.value.trim(), email, password: f.password.value, role: f.role.value, status: 'active', lastLogin: null, createdAt: new Date().toISOString() });
              HG.log('Tambah akun admin', email);
              toast('Akun dibuat. Catatan: demo menyimpan kata sandi di browser.', 'info'); closeModal(); refresh(); return true;
            }); }
          });
        }
      };
      draw();
    }
  };

  // ================= ANALYTICS =================
  views.analytics = {
    async render(root) {
      root.innerHTML = page('Analytics', 'Lalu lintas dan performa game. Data DEMO sampai Firebase Analytics terhubung.',
        `<label class="select-label">Rentang<select id="range"><option value="7">7 hari</option><option value="30" selected>30 hari</option><option value="90">90 hari</option><option value="365">1 tahun</option></select></label>`) +
        `<div id="anBody"><div class="skeleton"><div class="sk"></div><div class="sk"></div></div></div>`;
      let series = 'visitors';
      const load = async () => {
        const days = Number($('#range', root).value);
        const [a, year, games, cats] = await Promise.all([HG.analytics(days), HG.analytics(365), HG.list('games'), HG.list('categories')]);
        const sum = (k) => a.reduce((s, d) => s + d[k], 0);
        const months = {};
        year.forEach((d) => { const k = d.date.slice(0, 7); months[k] = (months[k] || 0) + d.visitors; });
        const monthBars = Object.entries(months).slice(-12).map(([k, v]) => ({ label: new Date(k + '-01').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }), value: v, color: '#657DFF' }));
        const catPerf = cats.map((c) => ({ label: c.name, color: c.color, value: games.filter((g) => g.category === c.id).reduce((s, g) => s + (g.plays || 0), 0) })).sort((x, y) => y.value - x.value);
        const topGames = [...games].filter((g) => g.status === 'published').sort((x, y) => y.plays - x.plays).slice(0, 8);
        const seg = [['visitors', 'Visitors'], ['views', 'Page views'], ['launches', 'Game launches']];
        $('#anBody', root).innerHTML = `
          <div class="kpis">
            ${kpi('Total visitors', fmt(sum('visitors')), 'users', 'Rentang dipilih ' + demoChip, 'ok')}
            ${kpi('Rata-rata / hari', fmt(Math.round(sum('visitors') / days)), 'calendar-days', 'visitor unik')}
            ${kpi('Page views', fmt(sum('views')), 'eye', 'tayangan halaman')}
            ${kpi('Game launches', fmt(sum('launches')), 'play', 'klik main game')}
          </div>
          <section class="card" style="margin-top:14px"><div class="card-head"><div class="seg" id="ser">${seg.map(([k, l]) => `<button data-s="${k}" class="${k === series ? 'on' : ''}" type="button">${l}</button>`).join('')}</div>${demoChip}</div><div class="chart-wrap" id="anChart" style="height:260px"></div></section>
          <div class="grid-2" style="margin-top:14px">
            <section class="card"><div class="card-head"><h2>Visitors per bulan</h2><span class="muted small">12 bulan terakhir</span></div><div class="chart-wrap" style="height:auto">${bars(monthBars)}</div></section>
            <section class="card"><div class="card-head"><h2>Category performance</h2><span class="muted small">total plays</span></div>${bars(catPerf)}</section>
          </div>
          <section class="card" style="margin-top:14px"><div class="card-head"><h2>Most popular games</h2><span class="muted small">total plays (demo)</span></div>
            <div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Game</th><th>Kategori</th><th>Plays</th></tr></thead><tbody>
              ${topGames.map((g, i) => `<tr><td class="muted">${i + 1}</td><td><div class="title-cell"><div class="thumb-sm" style="${thumbStyle(g.thumbnail)}"></div><b>${esc(g.title)}</b></div></td><td>${esc(catName(cats, g.category))}</td><td>${fmt(g.plays)}</td></tr>`).join('')}
            </tbody></table></div></section>`;
        mountChart($('#anChart', root), a.map((d) => d[series]), a.map((d) => dt(d.date)), series === 'launches' ? '#956BFF' : '#657DFF');
        $('#ser', root).onclick = (e) => { const b = e.target.closest('button'); if (!b) return; series = b.dataset.s; load(); };
      };
      $('#range', root).onchange = load;
      load();
    }
  };

  // ================= SEO =================
  views.seo = {
    async render(root) {
      const ctx = await siteCtx();
      const { draft } = ctx;
      const s = draft.settings;
      const media = ctx.media;
      const refresh2 = () => {
        $('#sTitle', root).textContent = (s.seoTitle || 'Judul halaman').slice(0, 60);
        $('#sDesc', root).textContent = (s.metaDescription || 'Deskripsi meta akan tampil di sini.').slice(0, 160);
        $('#sUrl', root).textContent = 'heygammer.example › ' + (s.name || 'HEYGAMMER').toLowerCase();
        $('#cT', root).textContent = `${(s.seoTitle || '').length}/60`;
        $('#cT', root).classList.toggle('over', (s.seoTitle || '').length > 60);
        $('#cD', root).textContent = `${(s.metaDescription || '').length}/160`;
        $('#cD', root).classList.toggle('over', (s.metaDescription || '').length > 160);
      };
      root.innerHTML = page('SEO Settings', 'Judul, deskripsi, dan meta untuk mesin pencari serta preview tautan.') + siteBar() + `
        <div class="split">
          <section class="card"><div class="section-title"><h2>Meta</h2></div>
            <div class="field-grid">
              <label class="full">SEO title<input data-k="seoTitle" maxlength="90"><span class="counter" id="cT"></span></label>
              <label class="full">Meta description<textarea data-k="metaDescription" rows="3" maxlength="200"></textarea><span class="counter" id="cD"></span></label>
              <label class="full">Keywords (pisahkan koma)<input data-k="keywords"></label>
              <label class="full">OG image URL<div class="pick-row"><input data-k="ogImageUrl" placeholder="https://…"><select data-pick="ogImageUrl"><option value="">Pilih media…</option>${mediaOpts(media, ['banner', 'logo'])}</select></div></label>
            </div></section>
          <section class="card"><div class="card-head"><h2>Preview hasil pencarian</h2></div>
            <div class="snippet"><div class="u" id="sUrl"></div><div class="t" id="sTitle"></div><div class="d" id="sDesc"></div></div>
            <p class="muted small" style="margin-top:12px">Perkiraan tampilan. Hasil asli bergantung pada mesin pencari.</p></section>
        </div>`;
      const ctrl = bindSiteBar(root, draft, { ...ctx, onChange: refresh2 });
      bindFields(root, s, () => { refresh2(); ctrl.changed(); });
      bindPickers(root);
      refresh2();
    }
  };

  // ================= GENERAL SETTINGS =================
  views.settings = {
    async render(root) {
      const ctx = await siteCtx();
      const { draft } = ctx;
      const s = draft.settings;
      const media = ctx.media;
      const me = HG.me();
      const drawNav = () => {
        $('#navList', root).innerHTML = s.nav.map((n, i) => `<div class="nav-row">
            <input data-nl="${i}" value="${esc(n.label)}" placeholder="Label" maxlength="30" aria-label="Label menu">
            <input data-nh="${i}" value="${esc(n.href)}" placeholder="#games atau URL" aria-label="Tujuan menu">
            <button class="btn-icon" data-nu="${i}" type="button" aria-label="Naik" ${i === 0 ? 'disabled' : ''}><i data-lucide="arrow-up"></i></button>
            <button class="btn-icon danger" data-nd="${i}" type="button" aria-label="Hapus"><i data-lucide="trash-2"></i></button>
          </div>`).join('') || '<p class="muted">Belum ada menu.</p>';
        icons();
      };
      root.innerHTML = page('General Settings', 'Identitas website, navigasi, status maintenance, dan bahasa.') + siteBar() + `
        <div class="split">
          <div class="stack" style="gap:14px">
            <section class="card"><div class="section-title"><h2>Identitas</h2></div>
              <div class="field-grid">
                <label>Nama website<input data-k="name" maxlength="40"></label>
                <label>Tagline<input data-k="tagline" maxlength="80"></label>
                <label class="full">Favicon URL<div class="pick-row"><input data-k="faviconUrl" placeholder="https://…"><select data-pick="faviconUrl"><option value="">Pilih media…</option>${mediaOpts(media, ['logo', 'thumbnail', 'banner'])}</select></div></label>
              </div></section>
            <section class="card"><div class="section-title"><h2>Navigasi</h2><button class="btn btn-ghost btn-sm" id="navAdd" type="button"><i data-lucide="plus"></i>Tambah</button></div>
              <div id="navList" class="stack" style="gap:8px"></div></section>
            <section class="card"><div class="section-title"><h2>Sosial media</h2></div>
              <div class="field-grid">
                <label>YouTube<input data-k="social.youtube" placeholder="https://"></label>
                <label>TikTok<input data-k="social.tiktok" placeholder="https://"></label>
                <label>Instagram<input data-k="social.instagram" placeholder="https://"></label>
                <label>Discord<input data-k="social.discord" placeholder="https://"></label>
              </div></section>
          </div>
          <div class="stack" style="gap:14px">
            <section class="card"><div class="section-title"><h2>Pengaturan umum</h2></div>
              <div class="field-grid">
                <label>Bahasa default<select data-k="language"><option value="id">Indonesia</option><option value="en">English</option></select></label>
                <label>Theme default<select data-k="theme"><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></label>
                <label class="check full"><span class="switch"><input type="checkbox" data-k="maintenance"><span></span></span> Mode maintenance <span class="muted small">(website menampilkan halaman perawatan)</span></label>
              </div></section>
            ${me.role === 'super_admin' && HG.mode === 'demo' ? `<section class="card danger-zone"><div class="section-title"><h2>Zona berbahaya</h2></div>
              <p class="muted small">Reset mengembalikan seluruh data DEMO ke kondisi awal dan membuatmu keluar.</p>
              <div class="page-actions" style="margin-top:10px"><button class="btn btn-danger" id="resetDemo" type="button"><i data-lucide="rotate-ccw"></i>Reset data demo</button></div></section>` : ''}
          </div>
        </div>`;
      const ctrl = bindSiteBar(root, draft, { ...ctx, onChange: () => {} });
      bindFields(root, s, ctrl.changed);
      bindPickers(root);
      drawNav();
      const navChanged = () => { drawNav(); ctrl.changed(); };
      $('#navAdd', root).onclick = () => { s.nav.push({ label: 'Menu', href: '#' }); navChanged(); };
      $('#navList', root).oninput = (e) => {
        const t = e.target; const idx = t.dataset.nl !== undefined ? +t.dataset.nl : t.dataset.nh !== undefined ? +t.dataset.nh : -1;
        if (idx < 0) return;
        if (t.dataset.nl !== undefined) s.nav[idx].label = t.value; else s.nav[idx].href = t.value;
        ctrl.changed();
      };
      $('#navList', root).onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.nu !== undefined) { const i = +b.dataset.nu; [s.nav[i - 1], s.nav[i]] = [s.nav[i], s.nav[i - 1]]; navChanged(); }
        if (b.dataset.nd !== undefined) { s.nav.splice(+b.dataset.nd, 1); navChanged(); }
      };
      const reset = $('#resetDemo', root);
      if (reset) reset.onclick = async () => {
        const ok = await confirmBox('Semua data DEMO (game, user, media, draft) akan dikembalikan ke awal. Lanjutkan?', { title: 'Reset data demo', okText: 'Reset' });
        if (!ok) return;
        await HG.reset(); toast('Data demo direset.', 'info');
        setTimeout(() => location.reload(), 600);
      };
    }
  };

  window.HGViews = views;
})();

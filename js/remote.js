// js/remote.js — game yang dikelola di HEYGAMMER Admin Studio (Firestore).
// Game berstatus published dimuat ke katalog. Game berupa file (HTML + CSS + JS + aset)
// dirakit menjadi satu halaman lalu dijalankan di iframe terkunci. Game berupa link
// memakai gameUrl sebagai src iframe.
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from './firebase.js';
import { RUNNERS } from './games/shared.js';

// Salinan inlineHtml dari admin studio (admin/js/views.js). Jaga keduanya tetap sama.
function norm(p) { const out = []; for (const s of p.split('/')) { if (!s || s === '.') continue; if (s === '..') out.pop(); else out.push(s); } return out.join('/'); }
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

async function loadBundleHtml(docId, entry) {
  const snap = await getDocs(collection(db, 'games', docId, 'files'));
  const files = new Map(snap.docs.map((d) => [d.data().path, d.data()]));
  if (!files.has(entry)) throw new Error('file utama tidak ditemukan');
  return inlineHtml(entry, files);
}

// Runner: sama seperti runner embed lain (box, done) → cleanup.
// Skor dari game dikirim lewat postMessage; sumbernya dicek dengan e.source karena iframe terkunci tidak punya origin.
function makeRunner(docId, g) {
  return (box, done) => {
    let alive = true;
    const fr = document.createElement('iframe');
    fr.title = g.title || 'game';
    fr.allow = 'fullscreen; autoplay; accelerometer; gyroscope';
    fr.setAttribute('allowfullscreen', '');
    const onMsg = (e) => {
      if (e.source === fr.contentWindow && e.data && typeof e.data.hgScore === 'number') {
        done(Math.max(0, Math.floor(e.data.hgScore)));
      }
    };
    addEventListener('message', onMsg);
    if (g.entry) {
      fr.setAttribute('sandbox', 'allow-scripts allow-pointer-lock');
      box.innerHTML = '<p class="meta" style="padding:24px">Memuat game…</p>';
      loadBundleHtml(docId, g.entry).then((html) => {
        if (!alive) return;
        box.innerHTML = '';
        fr.srcdoc = html;
        box.appendChild(fr);
      }).catch((e) => { if (alive) box.innerHTML = `<p class="meta" style="padding:24px">Gagal memuat game: ${e.message}</p>`; });
    } else {
      fr.src = g.gameUrl;
      box.appendChild(fr);
    }
    return () => { alive = false; removeEventListener('message', onMsg); fr.src = 'about:blank'; fr.remove(); };
  };
}

export async function loadRemoteGames() {
  if (!db) return { games: [], cats: [] };
  try {
    const [gSnap, cSnap] = await Promise.all([
      getDocs(query(collection(db, 'games'), where('status', '==', 'published'))),
      getDocs(collection(db, 'categories')),
    ]);
    const cats = new Map(cSnap.docs.map((d) => [d.id, d.data()]));
    const out = [];
    for (const d of gSnap.docs) {
      const g = d.data();
      if (!g.entry && !g.gameUrl) continue;
      const cat = cats.get(g.category);
      if (cat && cat.visible === false) continue;
      const catName = cat ? cat.name : 'Lainnya';
      const color = cat && /^#[0-9a-f]{6}$/i.test(cat.color || '') ? cat.color : '#657DFF';
      const key = 'rm-' + d.id;
      RUNNERS[key] = makeRunner(d.id, g);
      out.push({
        id: key, name: g.title || 'Tanpa judul', game: key, emoji: '🎮', cats: [catName],
        isNew: !!g.createdAt && Date.now() - Date.parse(g.createdAt) < 7 * 864e5,
        featured: !!g.featured, embed: true, bg: `linear-gradient(135deg,${color},#0f172a)`,
        thumbnail: g.thumbnail || '', order: g.order || 0,
      });
    }
    out.sort((a, b) => a.order - b.order);
    return { games: out, cats: [...new Set(out.flatMap((x) => x.cats))] };
  } catch (e) {
    console.warn('Game dari Firestore gagal dimuat:', e.message);
    return { games: [], cats: [] };
  }
}

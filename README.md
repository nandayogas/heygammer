# HEYGAMMER 🎮

**PLAY. EXPLORE. DOMINATE.** — website gaming dengan intro 3D, dashboard neon, 13 mini-game yang bisa dimainkan, dan leaderboard online.

## Struktur proyek

```
heygammer/
├── index.html
├── css/
│   ├── styles.css        # dashboard, sidebar, hero, header
│   └── game.css          # tampilan game & Game Mode (responsif)
├── js/
│   ├── app.js            # logika dashboard (navigasi, favorit, leaderboard, dll)
│   ├── intro.js          # intro 3D 360°
│   ├── three-scene.js    # latar 3D hero dan objek 3D bersama
│   ├── firebase.js       # backend Firebase (leaderboard online)
│   ├── games.js          # dispatcher: menjalankan runner berdasarkan key game
│   ├── games/
│   │   ├── shared.js     # helper bersama + registry RUNNERS
│   │   ├── classic.js    # Memory, Tic Tac Toe, Snake, 2048, RPS, Racing
│   │   ├── arcade.js     # Football Penalty, Basketball, Endless Runner, Fruit Match
│   │   └── more.js       # Space Shooter, Zombie Survival, Block Puzzle
│   └── data/
│       └── catalog.js    # daftar GAMES dan CATS (tambah game baru di sini)
├── termux/
│   └── setup.sh       # jalankan server lokal di Android (Termux)
├── tests/
│   └── e2e.cjs       # uji otomatis: tombol, navigasi, game sampai selesai, tampilan Android
└── README.md
```

**Menambah game baru:** tulis runner di `js/games/` (file baru jika file yang ada sudah penuh, lalu import di `js/games.js`), lalu tambahkan entri di `js/data/catalog.js` dengan `game` yang sama dengan key runner.

## Menjalankan secara lokal

Modul ES dan Three.js tidak bisa dibuka lewat `file://`, jadi jalankan server lokal:

```bash
cd heygammer
python -m http.server 8000
```

Lalu buka `http://localhost:8000`.

## Menjalankan di Android (Termux)

1. Pasang **Termux** dan **Chrome** dari F-Droid atau Play Store.
2. Salin folder proyek ke penyimpanan Termux (misalnya lewat `git clone` atau unzip di `~`).
3. Di Termux, jalankan:

```bash
cd heygammer
bash termux/setup.sh          # port 8080; atau: bash termux/setup.sh --port 9000
```

4. Buka `http://127.0.0.1:8080` di Chrome. Biarkan Termux tetap terbuka saat bermain.

Catatan: Three.js dan Firebase dimuat dari internet, jadi HP harus terhubung. Skrip ini hanya menjalankan server lokal; `tests/e2e.cjs` tidak dijalankan di Termux.

## Mengatur Firebase (opsional, untuk leaderboard online)

Tanpa langkah ini, website tetap berjalan dan leaderboard memakai data lokal.

1. Buka [console.firebase.google.com](https://console.firebase.google.com) dan buat project baru.
2. Di menu **Build → Firestore Database**, klik **Create database** (mode production).
3. Di **Project settings → Your apps**, klik ikon **Web (</>)**, lalu salin objek `firebaseConfig`.
4. Tempel nilainya ke `js/firebase.js`, menggantikan placeholder `YOUR_...`.
5. Di **Firestore → Rules**, pasang aturan berikut lalu **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/{id} {
      allow read: if true;
      allow create: if request.resource.data.score is int
        && request.resource.data.score >= 0
        && request.resource.data.score <= 100000
        && request.resource.data.game is string
        && request.resource.data.name is string
        && request.resource.data.name.size() <= 20;
      allow update, delete: if false;
    }
  }
}
```

> **Catatan keamanan:** aturan di atas membolehkan siapa pun menulis skor tanpa login, sehingga skor bisa dipalsukan. Untuk proyek yang lebih besar, tambahkan **Firebase Anonymous Auth** dan **App Check**, lalu validasi skor di Cloud Functions.

## Deploy ke GitHub Pages

1. Buat repository baru di GitHub, misalnya `heygammer`, lalu upload semua file di atas.
2. Buka **Settings → Pages**.
3. Di bagian **Build and deployment**, pilih **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Setelah beberapa menit, website tersedia di `https://username.github.io/heygammer/`.

## Fitur

- Intro 3D sinematik (±7 detik) dengan tombol **SKIP INTRO**, tampil setiap halaman dibuka atau di-refresh. Intro **3D Universe Cinematic** (Three.js: bintang, galaksi spiral, nebula, planet, black hole dengan lensing, logo 3D metalik, bloom) ada di `js/intro.js` dan `css/intro.css`. Ada HUD arcade, props game melayang, ikon game mengorbit, dan controller 3D. Kualitas otomatis turun di HP/Android; mode "kurangi animasi" memakai versi tenang (tanpa guncangan/kilatan); WebGL gagal memakai logo statis dengan pesan error kecil.
- **REPLAY INTRO** di menu Settings.
- Hormat terhadap *reduced motion* dari sistem atau dari Settings.
- Pencarian, filter (All, Popular, New, Top Rated), kategori, dan favorit tersimpan di `localStorage`.
- Recently Played: game terakhir yang dibuka, tersimpan di localStorage.
- Daily challenge dengan countdown dan status selesai per hari.
- Leaderboard online (Firebase) atau lokal bila Firebase belum diatur.

## Pengujian otomatis (Tahap 8)

Uji `tests/e2e.cjs` memeriksa tombol dan navigasi, membuka dan memainkan setiap game sampai layar hasil, serta tampilan Android (portrait dan landscape).

```bash
npm i -D playwright
npx playwright install chromium
node tests/e2e.cjs http://localhost:8000/index.html
```

Screenshot hasil uji disimpan di folder `tests/screenshots/`.

## Game embed & tampilan beranda (v11)

- 7 game HTML mandiri ada di `games/` (Arena Brawler, Neon Rush, Subway Runner 3D, Hill Climb Adventure, Tropical Kart Racing 3D, Tropical Kart Lite, Neonblast) dan dibuka lewat iframe (`js/games/embed.js`).
- Beranda hanya menampilkan game `featured: true`. Game lama muncul lewat **Kategori**, **Explore Games**, atau pencarian.
- Thumbnail animasi tiap game diatur di `js/data/thumbs.js` (CSS murni, gaya di `css/thumbs.css`).
- Game embed belum melapor skor. Agar masuk leaderboard, panggil `parent.postMessage({ hgScore: skor }, '*')` saat game selesai.
- Musik latar: `js/music.js` memutar video YouTube (ID di konstanta `VIDEO`) lewat embed tersembunyi. Mulai setelah klik/tap pertama, tombol 🔊 di header untuk mute, dan otomatis jeda saat masuk game.
- Catatan: `tests/e2e.cjs` belum diperbarui untuk game embed.

## Status katalog

Saat ini **13 game** sudah dibuat dan bisa dimainkan: Memory Challenge, Racing Fever, Tic Tac Toe, Snake Master, 2048 Challenge, Rock Paper Scissors, Space Shooter, Zombie Survival, Football Penalty, Basketball Challenge, Endless Runner, Fruit Match, dan Block Puzzle.

Tujuh game dari daftar 20 belum dibuat dan **belum** ditampilkan di katalog: Jungle Adventure, Super Platformer, Drift Racing, Tower Defense, Bubble Shooter, Chess Challenge, dan Car Parking Master.

## Roadmap yang disarankan

- Ganti emoji ikon dengan model GLB (GLTFLoader) untuk controller, piala, dan robot.
- Tambah game balap sungguhan untuk menggantikan Racing Fever.
- Login Google opsional untuk menyimpan profil di seluruh perangkat.
- Pindahkan validasi skor ke Cloud Functions.

## Lisensi

Ilustrasi dan kode dibuat khusus untuk proyek ini. Sesuaikan lisensi sebelum dipublikasikan.

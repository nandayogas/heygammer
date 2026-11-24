# HEYGAMMER 🎮

**PLAY. EXPLORE. DOMINATE.** — website gaming dengan intro 3D, dashboard neon, enam mini-game, dan leaderboard online.

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

- Intro 3D sinematik (±7 detik) dengan tombol **SKIP INTRO**, tampil hanya pada kunjungan pertama.
- **REPLAY INTRO** di menu Settings.
- Hormat terhadap *reduced motion* dari sistem atau dari Settings.
- Pencarian, filter (All, Popular, New, Top Rated), kategori, dan favorit tersimpan di `localStorage`.
- Daily challenge dengan countdown dan status selesai per hari.
- Leaderboard online (Firebase) atau lokal bila Firebase belum diatur.

## Roadmap yang disarankan

- Ganti emoji ikon dengan model GLB (GLTFLoader) untuk controller, piala, dan robot.
- Tambah game balap sungguhan untuk menggantikan Racing Fever.
- Login Google opsional untuk menyimpan profil di seluruh perangkat.
- Pindahkan validasi skor ke Cloud Functions.

## Lisensi

Ilustrasi dan kode dibuat khusus untuk proyek ini. Sesuaikan lisensi sebelum dipublikasikan.

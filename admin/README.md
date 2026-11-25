# HEYGAMMER Admin Studio

CMS admin untuk website HEYGAMMER. Dibuka langsung di browser tanpa build step.

## Menjalankan (mode DEMO)
- Buka `admin/index.html` di browser, atau jalankan `python3 -m http.server` di folder repo lalu buka `/admin/`.
- Akun demo (kata sandi `demo123`): `superadmin@heygammer.demo`, `admin@heygammer.demo`, `editor@heygammer.demo`.

## Hal yang sudah berjalan
- Login demo dengan role Super Admin, Admin, Editor; player tidak bisa masuk.
- CRUD game, draft/publish, urutan, featured, pencarian dan filter.
- Upload ZIP: validasi path, tipe file, ukuran, zip bomb, dan keberadaan index.html; preview lokal.
- Kategori, Homepage Builder (tambah, sembunyikan, urutkan dengan drag atau panah, edit, hapus), Website Customizer dengan live preview, SAVE DRAFT, PREVIEW, dan PUBLISH CHANGES.
- Media library dengan kompresi gambar, pencarian, rename, hapus, dan usage bar.
- User management dengan RBAC dan matriks permission; analytics dengan rentang tanggal dan grafik interaktif (DEMO).
- SEO, general settings, navigasi, maintenance, reset data demo.

## Belum tersambung
- Firebase belum dihubungkan. Lihat `firebase/README.md` untuk langkah dan rules.
- Ekstraksi ZIP di server belum ada; publish game membutuhkan Game URL yang sudah bisa diakses.
- Halaman publik per game dan website publik yang membaca draft/published belum dibuat di folder ini.

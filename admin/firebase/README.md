# HEYGAMMER — Firebase (project heygammer-d8afd)

## Yang sudah tersambung
- `admin/js/firebase-config.js` berisi config project heygammer-d8afd. Admin otomatis masuk mode **LIVE** saat dibuka.
- Login memakai Firebase Authentication (email & kata sandi).
- Data game, kategori, media, website (draft & published), user, dan log aktivitas disimpan di Firestore.
- Website (`js/firebase.js`) sudah memakai config yang sama untuk leaderboard `scores`.

## Langkah wajib di console (sekali saja)
1. **Firestore Database → Create database** (jika belum). Pilih lokasi, misalnya `asia-southeast2`.
2. **Firestore → Rules**: tempel isi `admin/firebase/firestore.rules`, lalu **Publish**. Ini menggantikan rules leaderboard lama dan sudah memuat blok `scores`.
3. **Authentication → Get started → Email/Password** aktifkan.
4. **Authentication → Users → Add user**: buat akun Super Admin (email + kata sandi).
5. Salin **UID** akun tersebut, lalu di **Firestore → Start collection** buat:
   - Collection ID: `admins`, Document ID: UID tadi
   - Field: `role` (string) = `super_admin`, `name` (string) = nama kamu, `email` (string) = email akun.
   Ini satu-satunya cara memberi role awal. Admin berikutnya bisa dibuat dari dalam studio (menu User Management) oleh Super Admin.

## Batasan mode LIVE
- Akun admin baru dibuat dari studio belum tersedia. Buat user di Authentication, lalu buat dokumen `admins/{uid}` secara manual.
- Gambar disimpan sebagai data di Firestore, maksimal ±700 KB per gambar. Upload ke Storage memerlukan plan Blaze.
- Ekstraksi ZIP game di server (Cloud Functions) memerlukan plan Blaze. Untuk Spark, game tetap di folder `games/` repo dan admin hanya menyimpan `gameUrl`.
- Analytics masih DEMO sampai Firebase Analytics atau agregasi dihubungkan.

## Keamanan
- Role hanya dibaca dari `admins/{uid}` di server. Frontend hanya untuk tampilan.
- Jangan pernah menaruh Admin SDK credentials atau private key di repo.
- Setelah uji selesai, pertimbangkan App Check agar tidak semua orang bisa menulis `scores`.

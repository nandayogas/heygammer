// js/firebase.js
// Backend: Firebase Firestore untuk leaderboard online.
// Isi firebaseConfig dengan config dari Firebase Console (Project settings → Your apps → Web).
// Selama belum diisi, website tetap berjalan dengan leaderboard lokal.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

const enabled = !String(firebaseConfig.apiKey).startsWith('YOUR_');
const db = enabled ? getFirestore(initializeApp(firebaseConfig)) : null;

export const backend = {
  enabled,

  /** Kirim satu skor ke koleksi "scores". */
  async submitScore({ name, game, score }) {
    if (!db) return false;
    await addDoc(collection(db, 'scores'), {
      name: String(name).slice(0, 20),
      game: String(game),
      score: Math.floor(Number(score)),
      createdAt: serverTimestamp(),
    });
    return true;
  },

  /** Ambil skor tertinggi. Mengembalikan null jika backend belum aktif. */
  async topScores(n = 10) {
    if (!db) return null;
    const snap = await getDocs(query(collection(db, 'scores'), orderBy('score', 'desc'), limit(n)));
    return snap.docs.map(d => d.data());
  },
};

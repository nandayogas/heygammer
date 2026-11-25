// js/firebase.js
// Backend: Firebase Firestore untuk leaderboard online.
// Isi firebaseConfig dengan config dari Firebase Console (Project settings → Your apps → Web).
// Selama belum diisi, website tetap berjalan dengan leaderboard lokal.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAboK41iNCxvCyoUtHuc14p2Durx5X1i64",
  authDomain: "heygammer-d8afd.firebaseapp.com",
  projectId: "heygammer-d8afd",
  storageBucket: "heygammer-d8afd.firebasestorage.app",
  messagingSenderId: "428220685224",
  appId: "1:428220685224:web:63c21598fdab913dfbdb9d",
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

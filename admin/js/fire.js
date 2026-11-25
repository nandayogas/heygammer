/* HEYGAMMER Admin Studio — jembatan Firebase (modul ES).
 * Dimuat setelah store.js. store.js menunggu event 'hgfire-ready'. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, getDocs, collection, query, orderBy, limit, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const app = initializeApp(window.HG_FIREBASE, 'heygammer-admin');
const auth = getAuth(app);
const db = getFirestore(app);

window.HGFire = {
  login: async (email, password) => (await signInWithEmailAndPassword(auth, email, password)).user.uid,
  logout: () => signOut(auth),
  whenAuth: () => new Promise((resolve) => {
    const un = onAuthStateChanged(auth, (u) => { un(); resolve(u); });
  }),
  readDoc: async (c, id) => {
    const s = await getDoc(doc(db, c, id));
    return s.exists() ? { id: s.id, ...s.data() } : null;
  },
  readColl: async (c, orderField, n = 500) => {
    const q = orderField ? query(collection(db, c), orderBy(orderField, 'desc'), limit(n)) : collection(db, c);
    return (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  setDoc: (c, id, data) => setDoc(doc(db, c, id), data, { merge: true }),
  delDoc: (c, id) => deleteDoc(doc(db, c, id))
};
window.dispatchEvent(new Event('hgfire-ready'));

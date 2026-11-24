// js/games.js — dispatcher game. Setiap game ada di js/games/*.js
import { RUNNERS } from './games/shared.js';
import './games/classic.js';
import './games/arcade.js';
import './games/more.js';

/** Jalankan game berdasarkan key. Mengembalikan fungsi cleanup (atau null). */
export function runGame(key, box, done, ctl) {
  const fn = RUNNERS[key];
  return fn ? fn(box, done, ctl) || null : null;
}


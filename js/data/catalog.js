// js/data/catalog.js — daftar game dan kategori. Tambah game baru cukup di sini
// (dan tambahkan runner-nya di js/games/*.js dengan key yang sama).
export const GAMES = [
  // featured: tampil di beranda. Game tanpa featured hanya muncul lewat Kategori / Explore / pencarian.
  // embed: game HTML mandiri di games/*.html, dibuka lewat iframe.
  { id: 'arena', name: 'Arena Brawler', game: 'arena', emoji: '🥊', cats: ['Fighting', 'Action', 'Arcade'], isNew: true, featured: true, embed: true, bg: 'linear-gradient(135deg,#4c1d95,#831843)' },
  { id: 'neonrush', name: 'Neon Rush', game: 'neonrush', emoji: '🏎️', cats: ['Racing', 'Action', 'Arcade'], isNew: true, featured: true, embed: true, bg: 'linear-gradient(135deg,#500724,#1e1b4b)' },
  { id: 'subway', name: 'Subway Runner 3D', game: 'subway', emoji: '🏃', cats: ['Platform', 'Action', 'Arcade'], isNew: true, featured: true, embed: true, bg: 'linear-gradient(135deg,#1e3a8a,#0f766e)' },
  { id: 'hillclimb', name: 'Hill Climb Adventure', game: 'hillclimb', emoji: '🚙', cats: ['Racing', 'Adventure', 'Action'], isNew: true, featured: true, embed: true, bg: 'linear-gradient(135deg,#7c2d12,#0f172a)' },
  { id: 'tropicalkart', name: 'Tropical Kart Racing 3D', game: 'tropicalkart', emoji: '🏝️', cats: ['Racing', 'Adventure'], isNew: true, featured: true, embed: true, bg: 'linear-gradient(135deg,#0e7490,#065f46)' },
  { id: 'kart', name: 'Tropical Kart Lite', game: 'kart', emoji: '🏁', cats: ['Racing', 'Arcade'], isNew: true, featured: true, embed: true, bg: 'linear-gradient(135deg,#0f766e,#04141c)' },
  { id: 'neonblast', name: 'Neonblast', game: 'neonblast', emoji: '🧱', cats: ['Arcade', 'Action'], isNew: true, featured: true, embed: true, bg: 'linear-gradient(135deg,#0c4a6e,#04060b)' },
  { id: 'memory', name: 'Memory Challenge', game: 'memory', emoji: '🧠', rating: 4.9, players: '2.1M', cats: ['Puzzle', 'Adventure'], bg: 'linear-gradient(135deg,#4c1d95,#1e3a8a)' },
  { id: 'racing', name: 'Racing Fever', game: 'racing', emoji: '🏎️', rating: 4.8, players: '1.8M', cats: ['Racing', 'Action', 'Sports'], isNew: true, bg: 'linear-gradient(135deg,#7f1d1d,#1e1b4b)' },
  { id: 'ttt', name: 'Tic Tac Toe', game: 'ttt', emoji: '❌', rating: 4.7, players: '1.5M', cats: ['Strategy', 'Simulation'], bg: 'linear-gradient(135deg,#1e1b4b,#0e7490)' },
  { id: 'snake', name: 'Snake Master', game: 'snake', emoji: '🐍', rating: 4.8, players: '1.2M', cats: ['Arcade', 'Action'], bg: 'linear-gradient(135deg,#14532d,#4c1d95)' },
  { id: '2048', name: '2048 Challenge', game: '2048', emoji: '🔢', rating: 4.8, players: '1.9M', cats: ['Puzzle', 'Strategy'], bg: 'linear-gradient(135deg,#78350f,#4c1d95)' },
  { id: 'rps', name: 'Rock Paper Scissors', game: 'rps', emoji: '✊', rating: 4.7, players: '1.6M', cats: ['Sports', 'Arcade'], isNew: true, bg: 'linear-gradient(135deg,#312e81,#831843)' },
  { id: 'penalty', name: 'Football Penalty', game: 'penalty', emoji: '⚽', cats: ['Sports', 'Arcade'], isNew: true, bg: 'linear-gradient(135deg,#166534,#1e3a8a)' },
  { id: 'basket', name: 'Basketball Challenge', game: 'basket', emoji: '🏀', cats: ['Sports', 'Casual'], isNew: true, bg: 'linear-gradient(135deg,#9a3412,#7c2d12)' },
  { id: 'runner', name: 'Endless Runner', game: 'runner', emoji: '🏃', cats: ['Arcade', 'Action', 'Platform'], isNew: true, bg: 'linear-gradient(135deg,#0c4a6e,#581c87)' },
  { id: 'fruit', name: 'Fruit Match', game: 'fruit', emoji: '🍉', cats: ['Puzzle', 'Casual'], isNew: true, bg: 'linear-gradient(135deg,#be185d,#166534)' },
  { id: 'shooter', name: 'Space Shooter', game: 'shooter', emoji: '🚀', cats: ['Shooting', 'Action', 'Arcade'], isNew: true, bg: 'linear-gradient(135deg,#1e1b4b,#0e7490)' },
  { id: 'zombie', name: 'Zombie Survival', game: 'zombie', emoji: '🧟', cats: ['Shooting', 'Action', 'Adventure'], isNew: true, bg: 'linear-gradient(135deg,#14532d,#451a03)' },
  { id: 'block', name: 'Block Puzzle', game: 'block', emoji: '🧱', cats: ['Puzzle', 'Casual'], isNew: true, bg: 'linear-gradient(135deg,#1e3a8a,#7c3aed)' },
];

export const CATS = [['Arcade', '🕹️'], ['Action', '💥'], ['Racing', '🏎️'], ['Adventure', '🧭'], ['Puzzle', '🧩'],
  ['Sports', '⚽'], ['Strategy', '♞'], ['Simulation', '✈️'], ['Multiplayer', '👥'], ['Casual', '☕'],
  ['Shooting', '🎯'], ['Fighting', '🥊'], ['Platform', '🍄'], ['Tower Defense', '🏰'], ['Board Games', '🎲']];

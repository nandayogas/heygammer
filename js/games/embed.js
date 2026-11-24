// js/games/embed.js — game HTML mandiri (games/*.html) dibuka lewat iframe.
// Game boleh mengirim skor ke dashboard: parent.postMessage({ hgScore: 1234 }, '*')
import { RUNNERS } from './shared.js';
const FILES = { neonrush: 'neonrush', subway: 'subwayrunner', hillclimb: 'hillclimbadventure', tropicalkart: 'tropicalkart', kart: 'kart', neonblast: 'neonblast', arena: 'arenabrawler' };
for (const [key, file] of Object.entries(FILES)) {
  RUNNERS[key] = box => {
    const fr = document.createElement('iframe');
    fr.src = `games/${file}.html`;
    fr.title = key;
    fr.allow = 'fullscreen; autoplay; accelerometer; gyroscope';
    fr.setAttribute('allowfullscreen', '');
    box.appendChild(fr);
    return () => { fr.src = 'about:blank'; fr.remove(); };
  };
}

#!/usr/bin/env node
/*
  Geschossbogen — alle Gegnergeschosse nebeneinander, gross, auf hellem
  UND dunklem Grund.

    node tools/geschossbogen.mjs [--datei=art/bogen/geschosse.png]

  WOZU: „Kein Tor ersetzt den Blick." Der Farbtor zaehlt Bildpunkte und
  sagt, ob eine Kugel ihr eigenes Signal traegt (Anteil warmer, satter
  Flaeche). Er sagt NICHT, ob man sie erkennt, ob zwei Arten sich gleichen
  oder ob eine Form auf 30 Bildpunkten zu Brei wird.

  DIE MESSSTELLE: die Texturen aus dem GEBAUTEN Spiel, sechsfach
  vergroessert, links auf #10151c (Nachthimmel), rechts auf #d8d2c4
  (Wueste). Das sind die zwei Faelle, in denen eine Kugel verschwinden
  kann: heller Kern auf hellem Grund, dunkler Rand auf dunklem.

  Vergroessert wird mit abgeschalteter Glaettung — was hier weich aussieht,
  ist weich gezeichnet und nicht hochskaliert.
*/
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { messstelle } from './messstelle.mjs';

const M = messstelle('Geschossbogen', 'alle Gegnergeschosse gross und auf beiden Gruenden.');
const arg = process.argv.find((a) => a.startsWith('--datei='));
const ZIEL = arg ? arg.slice(8) : 'art/bogen/geschosse.png';

if (!existsSync('dist/Skyfront.html')) M.abbruch('dist/Skyfront.html fehlt — erst bauen.');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.abbruch('Playwright nicht gefunden.'); }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 1100, height: 900 } });
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
await seite.waitForFunction(() => window.__game && window.__game.textures.exists('eb_orb'), null, { timeout: 90000 });

const bogen = await seite.evaluate(() => {
  const tex = window.__game.textures;
  const namen = tex.getTextureKeys().filter((k) => k.startsWith('eb_')).sort();
  // ZEILE muss die HOECHSTE Textur fassen (eb_lanze, 46 Punkte): sonst
  // liegt die Beschriftung auf dem Bild und drei von fuenfzehn Namen
  // sind nicht zu lesen. Ein Bogen, den man nicht lesen kann, taugt
  // so wenig wie einer, den man nicht sieht.
  const ZOOM = 5, SPALTE = 190, ZEILE = 280, PRO = 5;
  const zeilen = Math.ceil(namen.length / PRO);
  const tafel = SPALTE * PRO + 30;
  const c = document.createElement('canvas');
  c.width = tafel * 2; c.height = ZEILE * zeilen + 50;
  const t = c.getContext('2d');
  t.imageSmoothingEnabled = false;
  // JEDE Textur auf BEIDEN Gruenden. Der erste Entwurf legte einen
  // dunklen und einen hellen Halbgrund unter EIN Raster — dann stand die
  // mittlere Spalte auf der Kante und war auf keinem der beiden zu
  // beurteilen. Ein Bogen, auf dem man drei von fuenfzehn nicht sehen
  // kann, ist kein Bogen.
  [['#10151c', '#cfe3f2', 0], ['#d8d2c4', '#2a2620', tafel]].forEach(([grund, schrift, dx]) => {
    t.fillStyle = grund; t.fillRect(dx, 0, tafel, c.height);
    namen.forEach((n, i) => {
      const q = tex.get(n).getSourceImage();
      const x = dx + 15 + (i % PRO) * SPALTE + SPALTE / 2, y = 30 + Math.floor(i / PRO) * ZEILE + ZEILE / 2;
      t.drawImage(q, x - q.width * ZOOM / 2, y - q.height * ZOOM / 2, q.width * ZOOM, q.height * ZOOM);
      t.font = '13px sans-serif'; t.textAlign = 'center'; t.fillStyle = schrift;
      t.fillText(`${n}  ${q.width}x${q.height}`, x, y + ZEILE / 2 - 12);
    });
  });
  // Und die Zahl zum Bild: wie dunkel sind die ECKEN? Ein Hof, der nicht
  // ins Bild passt, wird am Rand abgeschnitten und steht als Rechteck um
  // die Kugel. Auf dunklem Grund faellt das nie auf.
  const ecken = namen.map((n) => {
    const q = tex.get(n).getSourceImage();
    const h = document.createElement('canvas');
    h.width = q.width; h.height = q.height;
    const g = h.getContext('2d'); g.drawImage(q, 0, 0);
    const d = g.getImageData(0, 0, q.width, q.height).data;
    const a = (x, y) => d[(y * q.width + x) * 4 + 3] / 255;
    return { name: n, ecke: Math.max(a(0, 0), a(q.width - 1, 0), a(0, q.height - 1), a(q.width - 1, q.height - 1)) };
  });
  return { datei: c.toDataURL('image/png'), namen, ecken };
});
await browser.close();

mkdirSync(dirname(ZIEL), { recursive: true });
const { writeFileSync } = await import('node:fs');
writeFileSync(ZIEL, Buffer.from(bogen.datei.split(',')[1], 'base64'));
console.log(`Geschossbogen — ${bogen.namen.length} Texturen: ${bogen.namen.join(', ')}`);
console.log(`  geschrieben nach ${ZIEL}`);
if (bogen.namen.length < 10) M.befund(`nur ${bogen.namen.length} Geschosstexturen gefunden — das sind zu wenige, da fehlt etwas.`);

// Der abgeschnittene Hof. 0,03 ist die Grenze: darunter ist eine Ecke
// praktisch leer, darueber steht ein sichtbares Rechteck. Gemessen an der
// Deckkraft der vier Eckpunkte der gebauten Textur.
const ECKE_MAX = 0.03;
const eckig = bogen.ecken.filter((e) => e.ecke > ECKE_MAX).sort((a, b) => b.ecke - a.ecke);
console.log(`  Eckdeckung (Grenze ${ECKE_MAX}): hoechste ${bogen.ecken.reduce((a, e) => Math.max(a, e.ecke), 0).toFixed(3)}`);
if (eckig.length)
  M.befund(`${eckig.length} Geschoss(e) haben einen abgeschnittenen Hof — die Ecken der Textur sind nicht leer `
    + `(${eckig.slice(0, 6).map((e) => `${e.name} ${e.ecke.toFixed(2)}`).join(', ')}). `
    + `Im Spiel steht dann ein dunkles Rechteck um die Kugel, sichtbar nur auf hellem Grund.`);
M.urteil();

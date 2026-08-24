#!/usr/bin/env node
/*
  Untergrund-Tafel — wie unruhig ist jedes Biom, und was nimmt die Schicht
  ihm ab?

    node tools/untergrund.mjs

  Warum im Browser und nicht mit sharp: das Spiel tastet den Untergrund mit
  `drawImage` auf KANTEN_PROBE Kantenlaenge ab, und Canvas rechnet dabei
  anders als sharp. Dieselben dreizehn Bilder ergaben 19,0 bei sharp und 32,8
  in der Canvas — Faktor 1,7. Eine Schwelle aus den sharp-Zahlen waere im
  Spiel eine ganz andere Schwelle. Deshalb laeuft hier DIE FUNKTION DES
  SPIELS, an denselben Bildern, im selben Browser.

  (Eiserne Regel: jede Zahl traegt ihre Messstelle mit.)
*/
import { existsSync, readFileSync } from 'node:fs';

if (!existsSync('dist/Skyfront.html')) { console.error('✗ dist/Skyfront.html fehlt — erst bauen.'); process.exit(1); }
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.log('  (—) Untergrund-Tafel: Playwright nicht gefunden — uebersprungen.'); process.exit(2); /* 2 = nicht gemessen, kein Mangel */ }

// Die drei Werte kommen aus der Quelle, nicht aus dem Kopf.
const quelle = readFileSync('src/app.js', 'utf8');
const zahl = (name) => {
  const m = new RegExp(`\\b${name} = (\\.?\\d+(?:\\.\\d+)?)`).exec(quelle);
  if (!m) { console.error(`✗ ${name} nicht in src/app.js gefunden`); process.exit(1); }
  return Number(m[1]);
};
const ZIEL = zahl('KANTEN_ZIEL'), MAX = zahl('KANTEN_MAX'), PROBE = zahl('KANTEN_PROBE');
// Diese drei stehen hier nur, um sie anzuzeigen und gegen das Gemessene zu
// halten — gerechnet wird im Spiel.

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
await seite.waitForFunction(() => window.__game, null, { timeout: 90000 });
await seite.waitForTimeout(1500);

const tafel = await seite.evaluate(async () => {
  // Gemessen wird DIE FUNKTION DES SPIELS (window.__SKF_UNTERGRUND), nicht
  // eine hier nachgebaute Formel. Der Unterschied ist kein Feinschliff: die
  // Gegenprobe "Beruhigungsschicht auf Schwarz" blieb gruen, solange dieses
  // Werkzeug die Mittelfarbe selbst ausrechnete — es haette die Sache
  // bezeugt, ohne sie je geprueft zu haben.
  const mess = window.__SKF_UNTERGRUND;
  if (typeof mess !== 'function') return { fehler: 'window.__SKF_UNTERGRUND fehlt — die Pruefnaht ist weg' };
  const feld = window.__SKFA || [];
  const namen = [];
  for (const s of document.querySelectorAll('script'))
    for (const m of s.textContent.matchAll(/(bg_[a-z]+): __SKFA\[(\d+)\]/g)) namen.push([m[1], Number(m[2])]);
  const aus = [];
  for (const [name, nr] of namen) {
    const bild = new Image();
    bild.src = feld[nr];
    await bild.decode().catch(() => {});
    if (!bild.width) { aus.push({ name, fehlt: true }); continue; }
    const w = mess(bild);
    aus.push({
      name,
      energie: w.energie,
      median: w.median,
      alpha: w.alpha,
      farbe: '#' + (w.farbe >>> 0).toString(16).padStart(6, '0'),
    });
  }
  return { liste: aus };
});
await browser.close();

if (tafel.fehler) { console.error('✗ ' + tafel.fehler); process.exit(1); }
const gut = tafel.liste.filter((x) => !x.fehlt).sort((a, b) => b.energie - a.energie);
for (const x of tafel.liste) if (x.fehlt) console.log(`  (—) ${x.name}: Bild nicht dekodierbar`);

console.log(`Untergrund-Tafel — ${gut.length} Biome, abgetastet auf ${PROBE} x ${PROBE} in der Canvas des Spiels`);
console.log(`Ziel-Kantenenergie ${ZIEL} · hoechstens ${(MAX * 100).toFixed(0)} % Kontrastruecknahme\n`);
console.log('  Biom          Kantenenergie   Deckkraft   danach   Median   Mittelfarbe');
let gedaempft = 0;
for (const x of gut) {
  const a = x.alpha;
  if (a > 0.01) gedaempft++;
  console.log(`  ${x.name.padEnd(12)} ${x.energie.toFixed(4).padStart(9)} ${a.toFixed(2).padStart(11)} ${(x.energie * (1 - a)).toFixed(4).padStart(9)} ${x.median.toFixed(3).padStart(8)}   ${x.farbe}`);
}
// Die Schicht traegt die MITTELFARBE des Bildes, nicht Schwarz. Der Grund
// ist messbar: so bleibt die mittlere Helligkeit stehen und nur der Umfang
// schrumpft. Schwarz waere Abdunkeln — und Abdunkeln nimmt der Gegnerkugel
// ihren dunklen Rand, der gerade ueber HELLEM Grund traegt (Frost 6,65:1 →
// 4,68:1 bei 22 % Abdunkelung). Deshalb wird hier nachgerechnet, dass die
// Mittelhelligkeit wirklich steht.
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const VERSATZ_MAX = 0.15;
const befunde = [];
for (const x of gut) {
  const a = x.alpha;
  if (a <= 0.01) continue;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(x.farbe.slice(i, i + 2), 16));
  const lf = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const nachher = x.median * (1 - a) + lf * a;
  const versatz = x.median ? Math.abs(nachher - x.median) / x.median : 0;
  if (versatz > VERSATZ_MAX)
    befunde.push(`${x.name}: die Schicht verschiebt die Mittelhelligkeit um ${(versatz * 100).toFixed(0)} % (${x.median.toFixed(3)} → ${nachher.toFixed(3)}), Grenze ${(VERSATZ_MAX * 100).toFixed(0)} %`);
}

const e = gut.map((x) => x.energie);
const nach = gut.map((x) => x.energie * (1 - x.alpha));
console.log(`\n  ${gedaempft} von ${gut.length} Biomen werden beruhigt.`);
console.log(`  Abstand unruhigstes zu ruhigstem: ${(Math.max(...e) / Math.min(...e)).toFixed(1)}x → ${(Math.max(...nach) / Math.min(...nach)).toFixed(1)}x`);

if (!gut.length) befunde.push('kein einziges Biom messbar — die Tafel bezeugt nichts');
if (befunde.length) {
  console.log('\nUNTERGRUND ROT:');
  for (const b of befunde) console.log('  · ' + b);
  process.exit(1);
}
console.log('\nUNTERGRUND GRÜN — die Schicht nimmt Kontrast, nicht Helligkeit.');

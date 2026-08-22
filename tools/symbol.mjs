// Backt das App-Symbol aus web/icon.svg.
//   node tools/symbol.mjs
//
// Erzeugt web/icon-{1024,512,192,180}.png und traegt die 180er Fassung
// zusaetzlich als data:-Adresse in index.head.html ein — damit die autarke
// Einzeldatei dasselbe Symbol zeigt wie die Web-App, ohne eine zweite Datei
// zu brauchen.
//
// Braucht Playwright (nur Entwicklung, nicht fuer den normalen Bau). Das
// Ergebnis wird eingecheckt; wer nur am Spiel arbeitet, ruft das hier nie auf.
import { readFileSync, writeFileSync } from 'fs';

const GROESSEN = [1024, 512, 192, 180];
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.error('✗ Playwright fehlt: npm install'); process.exit(1); }

const svg = readFileSync('web/icon.svg', 'utf8');
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
for (const g of GROESSEN) {
  const seite = await browser.newPage({ viewport: { width: g, height: g }, deviceScaleFactor: 1 });
  await seite.setContent(
    `<style>html,body{margin:0;padding:0;background:#050d18}svg{display:block;width:${g}px;height:${g}px}</style>${svg}`
  );
  await seite.waitForTimeout(300);
  writeFileSync(`web/icon-${g}.png`, await seite.screenshot());
  await seite.close();
}
await browser.close();

// In die Huelle eintragen. Beide Verweise, aber NUR die data:-Adresse in den
// beiden <link>-Zeilen — im Dokument stehen weiter unten noch 22 MB Base64
// fuer die Spielbilder, die hier nichts zu suchen haben.
const neu = readFileSync('web/icon-180.png').toString('base64');
let huelle = readFileSync('index.head.html', 'utf8');
let ersetzt = 0;
huelle = huelle.replace(
  /(<link rel="(?:apple-touch-icon|icon)"[^>]*?base64,)[A-Za-z0-9+/=]+/g,
  (_, kopf) => { ersetzt++; return kopf + neu; }
);
if (ersetzt !== 2) { console.error(`✗ Erwartet 2 Symbolverweise, ${ersetzt} ersetzt.`); process.exit(1); }
writeFileSync('index.head.html', huelle);

console.log(`✓ ${GROESSEN.map(g => `icon-${g}.png`).join(' · ')}`);
console.log(`✓ index.head.html: ${ersetzt} Symbolverweise erneuert (${(neu.length / 1024).toFixed(1)} KB Base64 je Verweis)`);

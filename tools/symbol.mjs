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
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import sharp from 'sharp';

const GROESSEN = [1024, 512, 192, 180];
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.error('✗ Playwright fehlt: npm install'); process.exit(1); }

const svg = readFileSync('web/icon.svg', 'utf8');
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });

async function backen(g, nurMaschine) {
  const seite = await browser.newPage({ viewport: { width: g, height: g }, deviceScaleFactor: 1 });
  // Fuer das Logo werden Grund und Schleier ausgeblendet — dieselbe Quelle,
  // kein zweites SVG, das auseinanderlaufen koennte.
  const aus = nurMaschine ? '#grund,#schleier{display:none}' : '';
  await seite.setContent(
    `<style>html,body{margin:0;padding:0;background:${nurMaschine ? 'transparent' : '#050d18'}}` +
    `svg{display:block;width:${g}px;height:${g}px}${aus}</style>${svg}`
  );
  await seite.waitForTimeout(300);
  const png = await seite.screenshot({ omitBackground: nurMaschine });
  await seite.close();
  return png;
}

for (const g of GROESSEN) writeFileSync(`web/icon-${g}.png`, await backen(g, false));
writeFileSync('web/logo-512.png', await backen(512, true));   // freigestellt, fuer den Ladeschirm
await browser.close();

// In die Huelle eintragen. Beide Verweise, aber NUR die data:-Adresse in den
// beiden <link>-Zeilen — im Dokument stehen weiter unten noch 22 MB Base64
// fuer die Spielbilder, die hier nichts zu suchen haben.
const symbol = readFileSync('web/icon-180.png').toString('base64');
const logo = readFileSync('web/logo-512.png').toString('base64');
let huelle = readFileSync('index.head.html', 'utf8');

let ersetzt = 0;
huelle = huelle.replace(
  /(<link rel="(?:apple-touch-icon|icon)"[^>]*?base64,)[A-Za-z0-9+/=]+/g,
  (_, kopf) => { ersetzt++; return kopf + symbol; }
);
if (ersetzt !== 2) { console.error(`✗ Erwartet 2 Symbolverweise, ${ersetzt} ersetzt.`); process.exit(1); }

// Das Bild im Ladeschirm: freigestellt, damit kein blauer Kasten auf dem
// blauen Verlauf klebt.
let logos = 0;
huelle = huelle.replace(
  /(<div id="splash">\s*<img src="data:image\/png;base64,)[A-Za-z0-9+/=]+/,
  (_, kopf) => { logos++; return kopf + logo; }
);
if (logos !== 1) { console.error(`✗ Ladeschirm-Bild nicht gefunden (${logos} Treffer).`); process.exit(1); }

writeFileSync('index.head.html', huelle);

console.log(`✓ ${GROESSEN.map(g => `icon-${g}.png`).join(' · ')} · logo-512.png`);
console.log(`✓ index.head.html: ${ersetzt} Symbolverweise (${(symbol.length / 1024).toFixed(0)} KB) + Ladeschirm-Bild (${(logo.length / 1024).toFixed(0)} KB)`);

// --- iOS-Startbilder --------------------------------------------------------
// Startet man aus dem Symbol, zeigt iOS weiss, bis die Seite malt. Bei 24 MB
// ist das lang. apple-touch-startup-image fuellt genau diese Luecke.
//
// Gerendert wird DIESELBE Huelle wie im Spiel, nur in Geraetegroesse — deshalb
// ist der Uebergang vom Startbild zur echten Seite unsichtbar. Ein separat
// gezeichnetes Startbild wuerde frueher oder spaeter auseinanderlaufen.
const GERAETE = [
  { b: 440, h: 956, s: 3 },   // 16 Pro Max
  { b: 430, h: 932, s: 3 },   // 14 Pro Max · 15 Plus · 15 Pro Max · 16 Plus
  { b: 428, h: 926, s: 3 },   // 12/13 Pro Max · 14 Plus
  { b: 414, h: 896, s: 3 },   // XS Max · 11 Pro Max
  { b: 414, h: 896, s: 2 },   // XR · 11
  { b: 414, h: 736, s: 3 },   // 8 Plus
  { b: 402, h: 874, s: 3 },   // 16 Pro
  { b: 393, h: 852, s: 3 },   // 14 Pro · 15 · 15 Pro · 16
  { b: 390, h: 844, s: 3 },   // 12 · 12 Pro · 13 · 13 Pro · 14
  { b: 375, h: 812, s: 3 },   // X · XS · 11 Pro · 12 mini · 13 mini
  { b: 375, h: 667, s: 2 },   // SE 2./3. Gen · 8
];

const huelleJetzt = readFileSync('index.head.html', 'utf8');
const seiteOhneSpiel = huelleJetzt + '\n</body>\n</html>\n';
writeFileSync('web/.startschirm.html', seiteOhneSpiel);

const browser2 = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
mkdirSync('web/start', { recursive: true });
let gesamt = 0;
const verweise = [];
for (const { b, h, s } of GERAETE) {
  const seite = await browser2.newPage({ viewport: { width: b, height: h }, deviceScaleFactor: s, isMobile: true });
  await seite.goto('file://' + resolve('web/.startschirm.html'));
  await seite.waitForTimeout(500);
  const datei = `start/${b}x${h}@${s}x.png`;
  const roh = await seite.screenshot();
  // Roh sind das je rund 1 MB, elf Stueck also gut 10 MB im Repo. Mit einer
  // 128-Farben-Palette bleibt ein Fuenftel davon, und am Verlauf ist kein
  // Streifen zu sehen — nachgesehen bei 1170x2532.
  const png = await sharp(roh).png({ palette: true, colours: 128, effort: 9, compressionLevel: 9 }).toBuffer();
  writeFileSync(`web/${datei}`, png);
  gesamt += png.length;
  await seite.close();
  verweise.push(
    `<link rel="apple-touch-startup-image" href="./${datei}" ` +
    `media="(device-width: ${b}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${s}) and (orientation: portrait)">`
  );
}
await browser2.close();
rmSync('web/.startschirm.html', { force: true });
writeFileSync('web/startbilder.html', verweise.join('\n') + '\n');
console.log(`✓ ${GERAETE.length} Startbilder (${(gesamt / 1048576).toFixed(2)} MB) + web/startbilder.html`);

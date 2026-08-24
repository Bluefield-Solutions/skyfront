// Backt das App-Symbol.
//   node tools/symbol.mjs
//
// Das SYMBOL kommt seit v20 aus einem Bild (web/quelle/icon-quelle.png),
// nicht mehr aus web/icon.svg. Das LADESCHIRM-LOGO weiter aus dem SVG: dort
// wird der Flieger freigestellt gebraucht, und ein freigestelltes Bild aus
// einer gemalten Vorlage waere ein zweiter, schlechterer Weg zum selben Ziel.
//
// Erzeugt web/icon-{1024,512,192,180}.png und traegt die 180er Fassung
// zusaetzlich als data:-Adresse in index.head.html ein — damit die autarke
// Einzeldatei dasselbe Symbol zeigt wie die Web-App, ohne eine zweite Datei
// zu brauchen.
//
// Braucht Playwright (nur Entwicklung, nicht fuer den normalen Bau). Das
// Ergebnis wird eingecheckt; wer nur am Spiel arbeitet, ruft das hier nie auf.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { resolve } from 'path';
import sharp from 'sharp';

const GROESSEN = [1024, 512, 192, 180];
const QUELLE = 'web/quelle/icon-quelle.png';

// Warum das Bild randlos sein MUSS und nicht bloss sollte:
//
// iOS legt ueber ein apple-touch-icon seine eigene abgerundete Maske —
// gemessen rund 22,4 % Eckradius. Bringt das Bild seine eigene Rundung mit,
// sieht man auf dem Homescreen eine Rundung in einer Rundung, mit dem
// Untergrund des Bildes als Rahmen dazwischen. Genau so kam die Vorlage:
// ein Glasfeld bei 76..1178 mit 20,5 % Radius auf dunkelblauem Grund.
//
// Weggeschnitten wurde nichts — der Flieger reicht bis dicht an den oberen
// Rand. Stattdessen sind die vier Ecken GEFUELLT, mit demselben Bild leicht
// vergroessert und weichgezeichnet. Dort liegt Himmel; die Fuellung setzt
// ihn fort, statt ihn zu erfinden.
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.error('✗ Playwright fehlt: npm install'); process.exit(1); }

const svg = readFileSync('web/icon.svg', 'utf8');
if (!existsSync(QUELLE)) { console.error(`✗ ${QUELLE} fehlt — ohne Vorlage kein Symbol.`); process.exit(1); }
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

// Bevor irgendetwas gebacken wird: bringt die Vorlage einen Rahmen mit?
//
// Gemessen wird die Streuung im aeusseren Ring (drei Bildpunkte breit, auf
// 256 gerechnet). Laeuft der Ring durch eine Flaeche, ist es ein Rahmen;
// liegt dort Inhalt, streut er.
//
// Die Grenze kommt aus den drei Faellen, die es gibt, nicht aus dem Kopf:
//   Vorlage mit Glasfeld auf blauem Grund   36,9   <- Rahmen
//   altes SVG-Symbol mit #grund             39,0   <- Rahmen
//   dieselbe Vorlage, randlos gebacken     112,1   <- Inhalt
// 60 liegt zwischen beiden Gruppen, mit Abstand nach beiden Seiten.
//
// WAS DAS NICHT SIEHT: ein Symbol, das absichtlich einfarbig bis an den
// Rand geht. Das waere auf dem Homescreen voellig in Ordnung und faellt hier
// trotzdem durch. Diese Pruefung sagt "randlos mit Inhalt", nicht "gut".
const RING_MIN = 60;

async function ringStreuung(bild) {
  const S = 256, B = 3;
  const { data } = await sharp(bild).resize(S, S, { fit: 'cover' }).removeAlpha()
    .raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => { const i = (y * S + x) * 3; return [data[i], data[i + 1], data[i + 2]]; };
  const p = [];
  for (let d = 0; d < B; d++) for (let i = 0; i < S; i++)
    p.push(px(i, d), px(i, S - 1 - d), px(d, i), px(S - 1 - d, i));
  const m = [0, 1, 2].map((c) => p.reduce((a, q) => a + q[c], 0) / p.length);
  return Math.sqrt(p.reduce((a, q) => a + [0, 1, 2].reduce((b, c) => b + (q[c] - m[c]) ** 2, 0), 0) / p.length);
}

// Die Gegenprobe zur Rahmenpruefung — im Werkzeug, nicht im Kopf.
//
//   node tools/symbol.mjs --probe
//
// Aus der aktuellen Vorlage wird ein Rahmen GEBAUT: verkleinert, auf eine
// Flaeche gelegt, Ecken gerundet. Genau das, was abgewiesen werden muss.
// Eine Grenze, die nie faellt, ist keine.
if (process.argv.includes('--probe')) {
  const S = 1024, rand = Math.round(S * 0.07), innen = S - 2 * rand;
  const feld = await sharp(QUELLE).resize(innen, innen).png().toBuffer();
  const rund = Buffer.from(`<svg width="${innen}" height="${innen}"><rect width="${innen}" height="${innen}" rx="${Math.round(innen * 0.2)}" ry="${Math.round(innen * 0.2)}" fill="#fff"/></svg>`);
  const mitRahmen = await sharp({ create: { width: S, height: S, channels: 3, background: '#0a1a2e' } })
    .composite([{ input: await sharp(feld).composite([{ input: rund, blend: 'dest-in' }]).png().toBuffer(), left: rand, top: rand }])
    .png().toBuffer();
  const ohne = await ringStreuung(QUELLE), mit = await ringStreuung(mitRahmen);
  console.log(`  Vorlage randlos:      Streuung ${ohne.toFixed(1)}  (muss ueber ${RING_MIN} liegen)`);
  console.log(`  dieselbe mit Rahmen:  Streuung ${mit.toFixed(1)}  (muss darunter liegen)`);
  const mangel = [];
  if (!(ohne >= RING_MIN)) mangel.push('die echte Vorlage faellt durch — die Grenze ist zu hoch');
  if (!(mit < RING_MIN)) mangel.push('ein gebauter Rahmen kommt durch — die Pruefung greift nicht');
  if (mangel.length) { console.error('✗ ' + mangel.join(' · ')); process.exit(1); }
  console.log('✓ Rahmenpruefung greift in beide Richtungen.');
  process.exit(0);
}

{
  const streu = await ringStreuung(QUELLE);
  console.log(`  Aussenring der Vorlage: Streuung ${streu.toFixed(1)} (Grenze ${RING_MIN})`);
  if (streu < RING_MIN) {
    console.error(`✗ ${QUELLE} bringt einen eigenen Rand mit (Streuung ${streu.toFixed(1)} < ${RING_MIN}).`);
    console.error('  iOS legt seine eigene abgerundete Maske darueber. Ein Bild mit eigenem');
    console.error('  Rahmen ergibt auf dem Homescreen eine Rundung in einer Rundung.');
    console.error('  Die Vorlage muss randlos sein — Inhalt bis an alle vier Kanten.');
    process.exit(1);
  }
}

// Das Symbol aus dem Bild — nicht durch den Browser, sondern direkt mit
// sharp: eine Zwischenstufe ueber HTML wuerde nur Bildpunkte kosten.
for (const g of GROESSEN)
  await sharp(QUELLE).resize(g, g, { fit: 'cover', kernel: 'lanczos3' })
    .flatten({ background: '#0a1a2e' }).removeAlpha()
    .png({ compressionLevel: 9 }).toFile(`web/icon-${g}.png`);
// Der Ladeschirm zeigt jetzt DAS SYMBOL, nicht mehr den freigestellten
// SVG-Flieger.
//
// Nachgesehen, nicht vermutet: nebeneinander gelegt lesen sich die beiden
// wie zwei verschiedene Spiele. Der SVG-Flieger ist eine einfache
// Silhouette mit Glanzverlauf, senkrecht, ohne Umgebung — das Symbol ist
// ein beplankter Rumpf mit gerichtetem Licht ueber einem Wolkenhorizont.
// Formensprache, Licht, Umgebung und Farbklang gehen in allen vier Punkten
// auseinander. Genau das ist der Befund "eine Sammlung unabhaengig
// erzeugter Bilder", den dieses Projekt nicht sein will.
//
// Das Symbol freizustellen waere der zweite, schlechtere Weg gewesen — ein
// aus einem Foto ausgeschnittener Flieger hat Rest-Himmel an den Kanten.
// Stattdessen wird das Symbol GANZ genommen, mit derselben abgerundeten
// Form, die iOS ihm auf dem Homescreen gibt. Damit sind Ladeschirm und
// Symbol nicht bloss aehnlich, sondern dasselbe Bild — Kohaerenz durch
// Bauart, nicht durch Nacharbeit.
// 396 Bildpunkte und WebP, nicht 512 und PNG.
//
// Der Ladeschirm wird bei 132 CSS-Punkten gezeigt; auf einem Geraet mit
// dreifacher Dichte sind das 396 Bildpunkte. Mehr ist verschenkt — und hier
// besonders teuer, weil das Bild als Base64 IN der Datei steckt, deren
// Ladezeit den Ladeschirm ueberhaupt erst noetig macht. Ein schoenerer
// Ladeschirm, der das Laden verlaengert, waere ein schlechtes Geschaeft.
//
// Gemessen: PNG 512 = 105 KB, PNG 396 = 67 KB, WebP 396 = 23 KB. Der alte
// freigestellte Flieger lag bei 72 KB. Es wird also zugleich besser UND
// leichter. (WebP ist in diesem Verzeichnis schon im Einsatz und traegt auf
// iOS ab 14.)
const LADE_PUNKTE = 396;
{
  const g = LADE_PUNKTE, r = Math.round(g * 0.2237);
  const rundung = Buffer.from(`<svg width="${g}" height="${g}"><rect width="${g}" height="${g}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);
  const quadrat = await sharp(QUELLE).resize(g, g, { fit: 'cover', kernel: 'lanczos3' }).png().toBuffer();
  writeFileSync('web/logo-lade.webp',
    await sharp(quadrat).composite([{ input: rundung, blend: 'dest-in' }])
      .webp({ quality: 82, alphaQuality: 90, effort: 6 }).toBuffer());
}
await browser.close();

// In die Huelle eintragen. Beide Verweise, aber NUR die data:-Adresse in den
// beiden <link>-Zeilen — im Dokument stehen weiter unten noch 22 MB Base64
// fuer die Spielbilder, die hier nichts zu suchen haben.
const symbol = readFileSync('web/icon-180.png').toString('base64');
const logo = readFileSync('web/logo-lade.webp').toString('base64');
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
  /(<div id="splash">\s*<img src="data:image\/)(?:png|webp)(;base64,)[A-Za-z0-9+/=]+/,
  (_, a, b) => { logos++; return a + 'webp' + b + logo; }
);
if (logos !== 1) { console.error(`✗ Ladeschirm-Bild nicht gefunden (${logos} Treffer).`); process.exit(1); }

writeFileSync('index.head.html', huelle);

console.log(`✓ ${GROESSEN.map(g => `icon-${g}.png`).join(' · ')} · logo-lade.webp (${LADE_PUNKTE} px)`);
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

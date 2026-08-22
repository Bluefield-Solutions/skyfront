// Baut dist/pages/ — den Master als installierbare Web-App fuer GitHub Pages.
// Der Einzeldatei-Bau bleibt unangetastet; hier entsteht nur die Huelle
// drumherum (Manifest, Symbol, Dienst-Arbeiter), die iOS zum Ablegen auf dem
// Startbildschirm braucht.
//   node pages.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'fs';
import { createHash } from 'crypto';
import { execSync } from 'child_process';

// Ersetzt das LETZTE Vorkommen. Noetig, weil "</body>" auch in Phasers
// JavaScript steckt (als String im SVG-Lader) — dort eingehaengt ergibt es
// einen Syntaxfehler, und der Dienst-Arbeiter meldet sich nie an.
function ersetzeLetztes(text, marke, ersatz) {
  const i = text.lastIndexOf(marke);
  if (i < 0) return null;
  return text.slice(0, i) + ersatz + text.slice(i + marke.length);
}

const AUS = 'dist/pages';
if (!existsSync('dist/Skyfront.html')) execSync('node build.mjs', { stdio: 'inherit' });
rmSync(AUS, { recursive: true, force: true });
mkdirSync(AUS, { recursive: true });

let html = readFileSync('dist/Skyfront.html', 'utf8');

// --- Symbole ----------------------------------------------------------------
// Als echte Dateien, nicht als data:-Adresse. Genau die ignoriert iOS beim
// Ablegen auf dem Startbildschirm — es nimmt dann einen Bildschirmausschnitt
// der Seite als Symbol. Quelle ist web/icon.svg, gebacken von
// tools/symbol.mjs; hier wird nur kopiert, damit der Pages-Bau ohne Browser
// auskommt.
const SYMBOLE = [180, 192, 512];
const masse = {};
for (const g of SYMBOLE) {
  const pfad = `web/icon-${g}.png`;
  if (!existsSync(pfad)) {
    console.error(`✗ ${pfad} fehlt — erst \`node tools/symbol.mjs\` laufen lassen.`);
    process.exit(1);
  }
  const png = readFileSync(pfad);
  // Aus dem PNG-Kopf lesen statt dem Dateinamen glauben: ein falsch
  // benanntes Symbol meldet iOS nicht, es zeigt einfach das falsche Bild.
  const breite = png.readUInt32BE(16), hoehe = png.readUInt32BE(20);
  if (breite !== g || hoehe !== g) {
    console.error(`✗ ${pfad} ist ${breite}x${hoehe}, erwartet ${g}x${g}.`);
    process.exit(1);
  }
  masse[g] = `${breite}x${hoehe}`;
  writeFileSync(`${AUS}/icon-${g}.png`, png);
}

// --- Manifest ---------------------------------------------------------------
const manifest = {
  name: 'Skyfront',
  short_name: 'Skyfront',
  id: './',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#05080d',
  theme_color: '#05080d',
  icons: SYMBOLE.map(g => ({ src: `./icon-${g}.png`, sizes: masse[g], type: 'image/png', purpose: 'any' }))
};
writeFileSync(`${AUS}/manifest.webmanifest`, JSON.stringify(manifest, null, 2));

// --- Huelle in die Seite einhaengen ----------------------------------------
// Das data:-Symbol bleibt drin: es schadet nicht und haelt die Einzeldatei
// weiterhin autark, wenn jemand sie ohne Server oeffnet.
const marke = createHash('sha1').update(html).digest('hex').slice(0, 8);

// Die data:-Verweise ERSETZEN, nicht ergaenzen. Stuenden beide da, haette iOS
// die Wahl zwischen einer Adresse, die es ignoriert, und einer Datei — und
// welche es nimmt, ist nicht verlaesslich. In der autarken Einzeldatei bleibt
// das data:-Symbol natuerlich, die hat ja keine Nachbardateien.
let getauscht = 0;
html = html.replace(
  /<link rel="apple-touch-icon"[^>]*?href="data:image\/png;base64,[A-Za-z0-9+/=]+"\s*\/?>/,
  () => { getauscht++; return '<link rel="apple-touch-icon" sizes="180x180" href="./icon-180.png">'; }
);
html = html.replace(
  /<link rel="icon"[^>]*?href="data:image\/png;base64,[A-Za-z0-9+/=]+"\s*\/?>/,
  () => { getauscht++; return '<link rel="icon" type="image/png" sizes="192x192" href="./icon-192.png">'; }
);
if (getauscht !== 2) { console.error(`✗ Erwartet 2 data:-Symbolverweise, ${getauscht} getauscht.`); process.exit(1); }

// --- iOS-Startbilder --------------------------------------------------------
// Nur hier, nicht in der Einzeldatei: das sind Nachbardateien, und die autarke
// HTML hat keine Nachbarn. Ohne sie zeigt iOS beim Start aus dem Symbol weiss,
// bis die Seite malt — bei 24 MB dauert das.
const startVerz = 'web/start';
if (!existsSync(startVerz) || !existsSync('web/startbilder.html')) {
  console.error('✗ web/start/ oder web/startbilder.html fehlt — erst `node tools/symbol.mjs` laufen lassen.');
  process.exit(1);
}
mkdirSync(`${AUS}/start`, { recursive: true });
let startZahl = 0, startBytes = 0;
for (const f of readdirSync(startVerz)) {
  const png = readFileSync(`${startVerz}/${f}`);
  writeFileSync(`${AUS}/start/${f}`, png);
  startZahl++; startBytes += png.length;
}
const startVerweise = readFileSync('web/startbilder.html', 'utf8').trim();
// Jeder Verweis muss eine Datei haben, die es auch gibt — sonst zeigt iOS
// stumm weiss, und niemand merkt es.
for (const m of startVerweise.matchAll(/href="\.\/(start\/[^"]+)"/g)) {
  if (!existsSync(`${AUS}/${m[1]}`)) { console.error(`✗ Startbild ${m[1]} fehlt.`); process.exit(1); }
}

if (!html.includes('<title>')) { console.error('✗ <title> nicht gefunden.'); process.exit(1); }
html = html.replace('<title>',
  '<link rel="manifest" href="./manifest.webmanifest">\n' + startVerweise + '\n  <title>');

const anmeldung = `
<script>
// Nur ueber http(s) — als lose Datei (file://) gibt es keinen Dienst-Arbeiter.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').then(function (reg) {
      // MUSS sein. Ohne diesen Aufruf bedient der alte Arbeiter jeden Start
      // vollstaendig aus dem Speicher, der Browser holt sw.js nie wieder und
      // das Telefon behaelt die zuerst installierte Fassung fuer immer.
      // Nachgemessen: ohne update() bleibt die Marke ueber drei Starts alt,
      // mit update() wechselt sie in unter einer Sekunde.
      // Ohne Netz schlaegt update() fehl — im Funkloch der Normalfall.
      // Unbehandelt landet das als Fehler in der Konsole.
      var still = function () {};
      reg.update().catch(still);
      setInterval(function () { reg.update().catch(still); }, 3600000);
    }).catch(function () {});
  });
  // Absichtlich KEIN location.reload() bei Wechsel: das Spiel wuerde mitten
  // im Lauf 24 MB neu laden. Die neue Fassung greift beim naechsten Start.
}
</script>
</body>`;
const endeKopf = html.lastIndexOf('</head>');
const endeLeib = html.lastIndexOf('</body>');
if (endeLeib < 0 || endeLeib < endeKopf) {
  console.error('✗ Kein brauchbares </body> gefunden (letztes liegt vor </head>).'); process.exit(1);
}
html = ersetzeLetztes(html, '</body>', anmeldung);

writeFileSync(`${AUS}/index.html`, html);
writeFileSync(`${AUS}/sw.js`, readFileSync('web/sw.js', 'utf8').replaceAll('__MARKE__', marke));
writeFileSync(`${AUS}/.nojekyll`, '');

const mb = (Buffer.byteLength(html) / 1048576).toFixed(2);
console.log(`✓ ${AUS}/ gebaut — index.html ${mb} MB · Symbole ${SYMBOLE.join('/')} · ${startZahl} Startbilder (${(startBytes/1048576).toFixed(2)} MB) · Marke ${marke}`);

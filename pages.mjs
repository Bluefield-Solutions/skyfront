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

// --- Bildvorrat auslagern ----------------------------------------------------
// In der Einzeldatei stehen 71 Bilder als Base64 im Dokument: 21 MB, die der
// Browser erst parsen muss, bevor irgendetwas passiert. Fuer die Web-App
// werden sie zu echten Dateien. Das bringt dreierlei: die HTML wird klein, die
// Bilder laden nebenlaeufig und einzeln zwischenspeicherbar, und eine
// Code-Aenderung uebertraegt nicht mehr 21 MB Bilder mit.
//
// Der Einzeldatei-Bau bleibt unberuehrt — autark heisst autark.
//
// NICHT ausgelagert wird, was Phaser intern zusammensetzt: __SKFA[0] und [2]
// sind BRUCHSTUECKE, die im Code per + mit weiterem Base64 verkettet werden.
// Als Datei waeren sie Unsinn. [1] ist Phasers weisses Ersatzbild und wird
// beim Hochfahren gebraucht, bevor ein Lader laeuft — das bleibt auch drin.
const PHASER_EIGEN = 3;

const anfang = html.indexOf('var __SKFA=[');
if (anfang < 0) { console.error('✗ __SKFA nicht gefunden.'); process.exit(1); }
const klammerAuf = html.indexOf('[', anfang);
const klammerZu = html.indexOf('];', klammerAuf);
if (klammerZu < 0) { console.error('✗ Ende von __SKFA nicht gefunden.'); process.exit(1); }
const vorrat = JSON.parse(html.slice(klammerAuf, klammerZu + 1));

const ENDUNG = { 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/gif': 'gif' };
mkdirSync(`${AUS}/bilder`, { recursive: true });

const bilderAbdruck = createHash('sha1');
let raus = 0, rausBytes = 0, drin = 0;
const neuerVorrat = vorrat.map((eintrag, n) => {
  if (n < PHASER_EIGEN) { drin++; return eintrag; }
  const komma = eintrag.indexOf(',');
  const kopf = komma > 0 ? eintrag.slice(5, eintrag.indexOf(';')) : '';
  const endung = ENDUNG[kopf];
  if (!endung || !eintrag.startsWith('data:image/')) { drin++; return eintrag; }

  const roh = Buffer.from(eintrag.slice(komma + 1), 'base64');
  // Vollstaendigkeit am Bild selbst pruefen, nicht am Praefix glauben: ein
  // abgeschnittenes Bild als Datei faellt sonst erst auf dem Telefon auf.
  const ganz =
    (endung === 'png'  && roh.slice(1, 4).toString() === 'PNG' && roh.slice(-8, -4).toString() === 'IEND') ||
    (endung === 'jpg'  && roh[0] === 0xFF && roh[1] === 0xD8 && roh[roh.length - 2] === 0xFF && roh[roh.length - 1] === 0xD9) ||
    (endung === 'webp' && roh.slice(0, 4).toString() === 'RIFF' && roh.slice(8, 12).toString() === 'WEBP') ||
    (endung === 'gif'  && roh.slice(0, 3).toString() === 'GIF' && roh[roh.length - 1] === 0x3B);
  if (!ganz) { drin++; return eintrag; }

  writeFileSync(`${AUS}/bilder/${n}.${endung}`, roh);
  bilderAbdruck.update(`${n}.${endung}`).update(roh);
  raus++; rausBytes += eintrag.length;
  return `./bilder/${n}.${endung}`;
});

html = html.slice(0, klammerAuf) + JSON.stringify(neuerVorrat) + html.slice(klammerZu + 1);

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
// Die Marke muss die Bilder mitzaehlen. Sonst passiert Folgendes: die Bilder
// aendern sich, die HTML nicht (dort stehen ja nur noch Dateinamen), die Marke
// bleibt gleich, der alte Speicher wird nicht weggeworfen — und das Telefon
// zeigt fuer immer die alten Bilder. Genau nachgemessen: nach dem Verkleinern
// von 15,75 auf 9,13 MB blieb die Marke unveraendert bei 511da9fe.
const marke = createHash('sha1')
  .update(html)
  .update(bilderAbdruck.digest())
  .digest('hex').slice(0, 8);

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
      // Die uebrigen Bilder im Hintergrund nachholen — aber NUR, wenn die
      // Seite vom Startbildschirm aus gestartet wurde.
      //
      // Der Grund: das sind 9,3 MB. Wer die App abgelegt hat, will sie
      // offline spielen koennen, und zahlt den Preis einmal je Fassung.
      // Wer nur im Browser vorbeischaut, hat darum nicht gebeten — und
      // ueber Mobilfunk waere es unverschaemt.
      //
      // Gemessen, was ohne das Nachladen wirklich noetig ist: 620 KB bis
      // zum Menue, 702 KB beim Start einer Partie. Das Spiel holt seine
      // Hintergrundbahnen laengst einzeln und wirft ungenutzte wieder weg.
      var alsApp = (window.matchMedia && matchMedia('(display-mode: standalone)').matches)
                || navigator.standalone === true;
      if (alsApp) setTimeout(function () {
        var a = navigator.serviceWorker.controller || reg.active;
        if (a) a.postMessage({ typ: 'vorladen' });
      }, 12000);

      // Anzeige fuer das Nachladen. Sie sitzt im schwarzen Balken ueber der
      // Leinwand, damit sie nichts vom Spiel verdeckt, und verschwindet,
      // sobald alles da ist.
      var schild = null;
      navigator.serviceWorker.addEventListener('message', function (e) {
        if (!e.data || e.data.typ !== 'vorladen-stand') return;
        if (!schild) {
          schild = document.createElement('div');
          schild.style.cssText = 'position:fixed;right:calc(10px + env(safe-area-inset-right));'
            + 'z-index:99998;font:600 11px/1.2 sans-serif;color:#9fc4e4;'
            + 'background:rgba(10,16,26,.72);border:1px solid #24405c;border-radius:9px;'
            + 'padding:6px 9px;pointer-events:none;transition:opacity .5s';
          document.body.appendChild(schild);
          var lw = document.querySelector('canvas');
          var platz = lw ? lw.getBoundingClientRect().top : 0;
          schild.style.top = (platz >= 40 ? platz - 34 : 8) + 'px';
        }
        schild.textContent = e.data.fertig >= e.data.gesamt
          ? 'offline bereit'
          : 'für offline: ' + e.data.fertig + '/' + e.data.gesamt;
        if (e.data.fertig >= e.data.gesamt) {
          setTimeout(function () { schild.style.opacity = '0'; }, 2200);
          setTimeout(function () { if (schild) schild.remove(); }, 3000);
        }
      });
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
const bilderListe = readdirSync(`${AUS}/bilder`).sort().map(f => `./bilder/${f}`);
writeFileSync(`${AUS}/sw.js`, readFileSync('web/sw.js', 'utf8')
  .replaceAll('__MARKE__', marke)
  .replace('__BILDER__', JSON.stringify(bilderListe)));
writeFileSync(`${AUS}/.nojekyll`, '');

const mb = (Buffer.byteLength(html) / 1048576).toFixed(2);
console.log(`✓ ${AUS}/ gebaut — index.html ${mb} MB (${raus} Bilder ausgelagert, ${(rausBytes/1048576).toFixed(2)} MB · ${drin} blieben drin) · ${startZahl} Startbilder · Marke ${marke}`);

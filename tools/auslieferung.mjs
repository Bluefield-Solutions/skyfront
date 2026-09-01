#!/usr/bin/env node
/*
  Auslieferung — ist der Pages-Bau wirklich lieferbar?

    node tools/auslieferung.mjs                 bauen, pruefen, im Browser nachsehen
    node tools/auslieferung.mjs --ohne-browser  nur die Struktur (fuer die Lieferkette)
    node tools/auslieferung.mjs --probe-ohne-musik   Gegenprobe: Musik NICHT ausgelagert

  DER ANLASS, und er ist ein Prozessfehler, kein Programmfehler:

  Seit v49 liegt die Musik im Bau. Damit wuchs dist/pages/index.html von
  3,4 auf 7,2 MB, und die Lieferkette verlangt unter 5 MB. Drei Fassungen
  in Folge (v49, v50, v51) sind gruen durch `npm run check` gegangen, auf
  main gelandet und dort an der Auslieferung gescheitert — jedes Mal mit
  einer E-Mail an den Nutzer und ohne dass irgendein Tor etwas gemerkt
  haette. Die Torkette hat den Pages-Bau nie gebaut.

  Ein gruener Lauf, der eine rote Lieferung nicht ausschliesst, ist kein
  gruener Lauf. Deshalb steht die Pruefung jetzt HIER und nicht mehr als
  Shell-Block in .github/workflows/pages.yml: an einer Stelle, die die
  Torkette laeuft, und in einer Sprache, in der sie messen kann statt nur
  zu vergleichen. Die Lieferkette ruft dieselbe Datei auf — zwei Kopien
  derselben Regel driften auseinander, und die eine, die niemand laufen
  laesst, ist immer die richtige.

  GEMESSEN WIRD AM GEBAUTEN VERZEICHNIS:

    Groesse       index.html unter der Schranke (die Auslagerung hat gegriffen)
    Auslagerung   Bilder und Musik liegen als Dateien, nicht als data:
    Verweise      jeder Verweis in der Seite hat seine Datei
    Arbeiter      der Dienst-Arbeiter kennt genau diese Dateien
    Huelle        Manifest, Symbole, Startbilder, Anmeldung, Speichermarke

  UND IM BROWSER, ueber http (nicht file://, sonst gibt es keinen
  Dienst-Arbeiter):

    Hochlauf      die Seite startet, ohne Fehler in der Konsole
    Musikwege     __SKFM zeigt auf Dateien, und die spielen wirklich
    Bereich       ein Range-Abruf aus dem Speicher gibt 206 und die
                  richtige Zahl Bytes zurueck — daran haengt, ob Safari
                  die Musik ueberhaupt abspielt
*/
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Auslieferung', 'der Pages-Bau ist vollstaendig und lieferbar.');
const OHNE_BROWSER = process.argv.includes('--ohne-browser');
const PROBE_OHNE_MUSIK = process.argv.includes('--probe-ohne-musik');

// Die Schranke. 5 MB ist keine technische Grenze, sondern die Zusage: was
// darueber liegt, ist nicht ausgelagert, und dann laedt das Telefon beim
// ersten Start alles auf einmal.
const SCHRANKE = 5_000_000;
const BILDER_MIN = 60;
const STUECKE = ['boss', 'menu', 'normal'];
const STARTBILDER = 11;

const AUS = 'dist/pages';

// Die Naht, an der dieses Tor haengt, ist das gebaute Verzeichnis selbst.
if (OHNE_NAHT) {
  M.ungemessen(`${AUS}/index.html fehlt — ohne gebauten Pages-Stand gibt es nichts zu messen.`);
  M.urteil();
}

console.log('Auslieferung\n');
console.log('▶ dist/pages/ bauen');
try {
  execSync('node build.mjs && node pages.mjs', {
    stdio: 'inherit',
    env: { ...process.env, ...(PROBE_OHNE_MUSIK ? { SKF_PROBE_OHNE_MUSIK: '1' } : {}) },
  });
} catch {
  M.abbruch('der Pages-Bau ist gescheitert — davor ist nichts zu messen.');
}

if (!existsSync(`${AUS}/index.html`)) M.abbruch(`${AUS}/index.html fehlt.`);
const html = readFileSync(`${AUS}/index.html`, 'utf8');
const sw = existsSync(`${AUS}/sw.js`) ? readFileSync(`${AUS}/sw.js`, 'utf8') : null;
if (sw === null) M.abbruch(`${AUS}/sw.js fehlt.`);

// Kam der Eingriff der Gegenprobe ueberhaupt an? Ein nicht angekommener
// Eingriff sieht aus wie ein bestandenes Tor — drei von zehn Proben sind
// in diesem Projekt schon daran gescheitert, nicht am Tor.
if (PROBE_OHNE_MUSIK && !html.includes('data:audio/mpeg;base64,')) {
  M.abbruch('die Gegenprobe ist nicht angekommen: die Musik ist trotzdem ausgelagert.');
}

// ---- Groesse ---------------------------------------------------------------
const groesse = Buffer.byteLength(html);
console.log('\n  Groesse');
console.log(`    index.html          ${(groesse / 1048576).toFixed(2)} MB   (Schranke ${(SCHRANKE / 1048576).toFixed(2)} MB)`);
if (groesse >= SCHRANKE) {
  M.befund(`index.html ist ${groesse} Bytes — die Auslagerung hat nicht gegriffen. `
    + `Genau hieran ist die Lieferung seit v49 gescheitert.`);
}

// ---- Auslagerung -----------------------------------------------------------
const bilder = existsSync(`${AUS}/bilder`) ? readdirSync(`${AUS}/bilder`).sort() : [];
const musik = existsSync(`${AUS}/musik`) ? readdirSync(`${AUS}/musik`).sort() : [];
console.log('\n  Auslagerung');
console.log(`    Bilder              ${bilder.length} Dateien, ${(bilder.reduce((s, f) => s + statSync(`${AUS}/bilder/${f}`).size, 0) / 1048576).toFixed(2)} MB`);
console.log(`    Musik               ${musik.length} Dateien, ${(musik.reduce((s, f) => s + statSync(`${AUS}/musik/${f}`).size, 0) / 1048576).toFixed(2)} MB`);
if (bilder.length < BILDER_MIN) M.befund(`nur ${bilder.length} ausgelagerte Bilder, erwartet mindestens ${BILDER_MIN}.`);
for (const s of STUECKE) if (!musik.includes(`${s}.mp3`)) M.befund(`musik/${s}.mp3 fehlt — dieser Modus laeuft ohne Stueck.`);
// Nichts darf als data: zurueckbleiben. Ein einziges Stueck reicht, um die
// Seite ueber die Schranke zu heben.
if (html.includes('data:audio/')) M.befund('die Seite enthaelt noch data:audio — Musik nicht (vollstaendig) ausgelagert.');
if (!html.includes('./bilder/')) M.befund('die Seite verweist auf keine ausgelagerte Bilddatei.');
if (!html.includes('./musik/')) M.befund('die Seite verweist auf keine ausgelagerte Musikdatei.');

// ---- Verweise --------------------------------------------------------------
// Jeder Verweis braucht seine Datei. Fehlt sie, laedt das Spiel still ein
// Bild weniger — und das faellt erst auf dem Telefon auf.
const verweise = [...html.matchAll(/\.\/(bilder|musik|start|icon-\d+\.png)[^"']*/g)].map((m) => m[0].slice(2));
let fehlend = 0;
for (const v of new Set(verweise)) if (!existsSync(`${AUS}/${v}`)) { M.befund(`Verweis ohne Datei: ./${v}`); fehlend++; }
console.log('\n  Verweise');
console.log(`    in der Seite        ${new Set(verweise).size} verschiedene, ${fehlend} ohne Datei`);

// ---- Dienst-Arbeiter -------------------------------------------------------
for (const platzhalter of ['__MARKE__', '__BILDER__', '__MUSIK__']) {
  if (sw.includes(platzhalter)) M.befund(`${platzhalter} steht noch im Dienst-Arbeiter — der Bau hat es nicht ersetzt.`);
}
const swBilder = [...sw.matchAll(/\.\/bilder\/[^"]+/g)].map((m) => m[0].slice(2));
const swMusik = [...sw.matchAll(/\.\/musik\/[^"]+/g)].map((m) => m[0].slice(2));
console.log('\n  Dienst-Arbeiter');
console.log(`    kennt Bilder        ${swBilder.length} von ${bilder.length}`);
console.log(`    kennt Musik         ${swMusik.length} von ${musik.length}`);
if (swBilder.length !== bilder.length) M.befund(`der Arbeiter kennt ${swBilder.length} von ${bilder.length} Bildern — der Rest fehlt ohne Netz.`);
if (swMusik.length !== musik.length) M.befund(`der Arbeiter kennt ${swMusik.length} von ${musik.length} Stuecken — ohne Netz bliebe es still.`);
const marke = (sw.match(/^const MARKE = 'skyfront-([0-9a-f]{8})';/m) || [])[1];
console.log(`    Speichermarke       ${marke || '—'}`);
if (!marke) M.befund('keine achtstellige Speichermarke im Dienst-Arbeiter — der alte Speicher wird nie weggeworfen.');
// Der Bereichsabruf ist es, an dem Safari die Musik verweigert. Er ist im
// Arbeiter Code, nicht Konfiguration — also hier nachgesehen, dass es ihn gibt.
if (!/status: 206/.test(sw)) M.befund('der Arbeiter beantwortet keinen Bereichsabruf (206) — Safari spielt dann keine Musik aus dem Speicher.');

// ---- Huelle ----------------------------------------------------------------
console.log('\n  Huelle');
for (const d of ['manifest.webmanifest', 'sw.js', '.nojekyll', 'icon-180.png', 'icon-192.png', 'icon-512.png']) {
  if (!existsSync(`${AUS}/${d}`)) M.befund(`${d} fehlt.`);
}
if (!/rel="manifest"/.test(html)) M.befund('kein rel="manifest" in der Seite — ohne Manifest keine Web-App.');
if (!/serviceWorker\.register/.test(html)) M.befund('keine Anmeldung des Dienst-Arbeiters in der Seite.');
const touch = (html.match(/rel="apple-touch-icon"/g) || []).length;
if (touch !== 1) M.befund(`${touch} apple-touch-icon-Verweise, erwartet genau einen.`);
if (/rel="apple-touch-icon"[^>]*href="data:/.test(html)) M.befund('das apple-touch-icon zeigt auf eine data:-Adresse — genau die ignoriert iOS.');
const start = (html.match(/apple-touch-startup-image/g) || []).length;
const startDateien = existsSync(`${AUS}/start`) ? readdirSync(`${AUS}/start`).length : 0;
console.log(`    Startbilder         ${start} Verweise, ${startDateien} Dateien`);
if (start !== STARTBILDER) M.befund(`${start} Startbild-Verweise, erwartet ${STARTBILDER}.`);
if (startDateien !== STARTBILDER) M.befund(`${startDateien} Startbild-Dateien, erwartet ${STARTBILDER}.`);
console.log(`    Manifest, Anmeldung, Symbol  ${M.hatBefund() ? '—' : 'sitzen'}`);

// ---- Im Browser ------------------------------------------------------------
if (OHNE_BROWSER) {
  M.ungemessen('--ohne-browser: Hochlauf, Musikwege und Bereichsabruf NICHT gemessen.');
  M.urteil(`index.html ${(groesse / 1024).toFixed(0)} KB · ${bilder.length} Bilder · ${musik.length} Stuecke.`);
}

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.ungemessen('Playwright nicht gefunden — im Browser nichts gemessen.'); M.urteil(); }

// Ein winziger Server. Notwendig, nicht bequem: unter file:// gibt es
// keinen Dienst-Arbeiter, keinen Speicher und keinen Bereichsabruf — und
// genau die drei sind hier die Frage.
const TYP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.gif': 'image/gif', '.mp3': 'audio/mpeg' };
// Was der Server STATT der Datei ausliefert. Bleibt leer, ausser waehrend
// der Fassungsprobe ganz unten — dort liegt hier die neue Fassung.
const ERSATZ = new Map();

// GitHub Pages liefert HTML mit `Cache-Control: max-age=600`. Ohne diese
// Zeile misst die Fassungsprobe gegen einen Server, der jede Datei frisch
// herausgibt — und dann kann sie den Fehler, den sie sucht, gar nicht
// sehen. Der Zwischenspeicher des Browsers IST hier der Messgegenstand.
const HTTP_SPEICHER = 600;

const server = createServer((anfrage, antwort) => {
  let pfad = decodeURIComponent(anfrage.url.split('?')[0]);
  if (pfad === '/') pfad = '/index.html';
  const datei = join(AUS, normalize(pfad).replace(/^(\.\.[/\\])+/, ''));
  const ersatz = ERSATZ.get(pfad);
  if (ersatz === undefined && (!existsSync(datei) || statSync(datei).isDirectory())) { antwort.writeHead(404).end(); return; }
  const roh = ersatz === undefined ? readFileSync(datei) : Buffer.from(ersatz);
  const typ = TYP[extname(datei)] || 'application/octet-stream';
  const bereich = anfrage.headers.range;
  // Auch der Server muss Bereiche koennen, sonst misst der Bereichsabruf
  // beim ersten Mal (noch nicht im Speicher) gegen einen Server, der es
  // nicht kann — und das Ergebnis saehe nach einem Fehler des Arbeiters aus.
  if (bereich) {
    const m = /bytes=(\d*)-(\d*)/.exec(bereich);
    const von = m && m[1] ? parseInt(m[1], 10) : 0;
    const bis = m && m[2] ? Math.min(parseInt(m[2], 10), roh.length - 1) : roh.length - 1;
    antwort.writeHead(206, {
      'Content-Type': typ, 'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${von}-${bis}/${roh.length}`, 'Content-Length': bis - von + 1,
    }).end(roh.slice(von, bis + 1));
    return;
  }
  antwort.writeHead(200, {
    'Content-Type': typ, 'Content-Length': roh.length, 'Accept-Ranges': 'bytes',
    'Cache-Control': `max-age=${HTTP_SPEICHER}`,
  }).end(roh);
});
await new Promise((f) => server.listen(0, '127.0.0.1', f));
const adresse = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const fehler = [];
seite.on('pageerror', (e) => fehler.push(String(e)));
seite.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });

let hoch = false;
// Ausserhalb von `if (hoch)`, weil die Fassungsprobe ganz unten daran haengt.
let arbeiter = null;
try {
  await seite.goto(adresse);
  await seite.waitForFunction(() => window.__game && window.__game.scene, null, { timeout: 90000 });
  hoch = true;
} catch (e) { fehler.push(e.message); }

console.log('\n  Im Browser (' + adresse + ')');
console.log(`    Hochlauf            ${hoch ? 'gestartet' : 'NICHT gestartet'}, ${fehler.length} Fehler`);
for (const f of fehler.slice(0, 5)) console.log('      ! ' + String(f).slice(0, 160));
if (!hoch) M.befund('die ausgelieferte Seite startet ueber http nicht.');
if (fehler.length) M.befund(`${fehler.length} Fehler in der Konsole der ausgelieferten Seite: ${String(fehler[0]).slice(0, 120)}`);

if (hoch) {
  // Zeigt __SKFM auf Dateien — und laesst sich eine davon wirklich abspielen?
  // Ein Weg, der stimmt, aber nichts liefert, klingt genauso wie keiner.
  const wege = await seite.evaluate(async () => {
    if (typeof window.__SKFM === 'undefined') return null;
    const aus = [];
    for (const k of Object.keys(window.__SKFM)) {
      const weg = window.__SKFM[k];
      const dauer = await new Promise((f) => {
        const a = new Audio(weg);
        a.addEventListener('loadedmetadata', () => f(a.duration));
        a.addEventListener('error', () => f(-1));
        setTimeout(() => f(0), 15000);
      });
      aus.push({ modus: k, weg, dauer });
    }
    return aus;
  });
  if (!wege) M.ungemessen('__SKFM fehlt in der ausgelieferten Seite.');
  else {
    console.log('\n    Modus     Weg                     Dauer');
    for (const w of wege) {
      console.log(`    ${w.modus.padEnd(9)} ${String(w.weg).slice(0, 22).padEnd(23)} ${w.dauer > 0 ? w.dauer.toFixed(1) + ' s' : '—'}`);
      if (String(w.weg).startsWith('data:')) M.befund(`Modus ${w.modus} laeuft aus einer data:-Adresse — nicht ausgelagert.`);
      if (w.dauer < 0) M.befund(`Modus ${w.modus}: ${w.weg} laesst sich nicht laden.`);
      else if (w.dauer === 0) M.ungemessen(`Modus ${w.modus}: keine Dauer innerhalb von 15 s.`);
      else if (w.dauer < 30) M.befund(`Modus ${w.modus} ist nur ${w.dauer.toFixed(1)} s lang — das wiederholt sich im Sektor zu oft.`);
    }
  }

  // Der Dienst-Arbeiter, und an ihm der Bereichsabruf.
  arbeiter = await seite.evaluate(async () => {
    if (!navigator.serviceWorker) return { da: false };
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    if (!reg) return { da: false };
    for (let i = 0; i < 40 && !navigator.serviceWorker.controller; i++) await new Promise((f) => setTimeout(f, 250));
    if (!navigator.serviceWorker.controller) return { da: true, fuehrt: false };
    // Erst voll holen (der Arbeiter legt es ab), dann in Bereichen fragen:
    // die zweite Anfrage wird aus dem Speicher beantwortet, und genau die
    // muss eine 206 sein.
    await fetch('./musik/menu.mp3');
    const a = await fetch('./musik/menu.mp3', { headers: { Range: 'bytes=100-1099' } });
    const b = await a.arrayBuffer();
    return { da: true, fuehrt: true, status: a.status, bytes: b.byteLength, spanne: a.headers.get('Content-Range') };
  });
  console.log('\n    Dienst-Arbeiter     ' + (arbeiter.da ? (arbeiter.fuehrt ? 'angemeldet und fuehrend' : 'angemeldet, fuehrt nicht') : 'nicht da'));
  if (!arbeiter.da) M.befund('der Dienst-Arbeiter meldet sich nicht an — ohne ihn gibt es keine Web-App und nichts offline.');
  else if (!arbeiter.fuehrt) M.ungemessen('der Arbeiter fuehrt die Seite nicht — Bereichsabruf nicht gemessen.');
  else {
    console.log(`    Bereichsabruf       ${arbeiter.status} · ${arbeiter.bytes} Bytes · ${arbeiter.spanne}`);
    if (arbeiter.status !== 206) M.befund(`der Bereichsabruf aus dem Speicher gibt ${arbeiter.status} statt 206 — Safari spielt die Musik dann nicht.`);
    if (arbeiter.bytes !== 1000) M.befund(`der Bereichsabruf gibt ${arbeiter.bytes} Bytes statt der verlangten 1000.`);
  }
}

// ---- Kommt eine neue Fassung ueberhaupt an? --------------------------------
//
// DER FALL: auf dem Telefon liegt die abgelegte App, auf dem Server liegt
// seit einer Minute eine neue Fassung. Wie oft muss man starten, bis man
// sie sieht?
//
// Bis hierher hat dieses Tor nur geprueft, dass sich EIN Arbeiter anmeldet.
// Ob je ein ZWEITER durchkommt, hat kein Tor gemessen — und genau das ist
// der Weg, auf dem eine Lieferung das Geraet erreicht. Ein Spiel, das
// ausgeliefert wird und nicht ankommt, ist nicht ausgeliefert.
//
// ZWEI Starts sind die Zusage: der erste holt den neuen Arbeiter, der
// zweite wird von ihm bedient. Drei sind ein Befund.
const STARTS_MAX = 2;
if (hoch && arbeiter && arbeiter.fuehrt) {
  const KENNZEICHEN = 'SKF-FASSUNGSPROBE';
  const marke2 = marke === 'deadbeef' ? 'cafebabe' : 'deadbeef';
  // Eine Auslieferung veraendert BEIDES: die Seite und die Marke des
  // Arbeiters. Nur die Seite zu tauschen waere keine Auslieferung — dann
  // gaebe es keinen Anlass, den Arbeiter zu erneuern, und die Probe
  // wuerde eine Selbstverstaendlichkeit messen.
  ERSATZ.set('/index.html', html.replace('<title>', `<title>${KENNZEICHEN} `));
  ERSATZ.set('/sw.js', sw.replaceAll(`skyfront-${marke}`, `skyfront-${marke2}`));

  // Kam der Eingriff an? Ein nicht angekommener Eingriff sieht aus wie eine
  // bestandene Probe.
  const geliefert = await seite.evaluate(async () => {
    const a = await fetch('./sw.js', { cache: 'no-store' });
    return a.text();
  });
  if (!geliefert.includes(`skyfront-${marke2}`)) {
    M.ungemessen('die neue Fassung liegt nicht auf dem Server — Fassungsprobe nicht gemessen.');
  } else {
    let starts = 0, angekommen = false;
    while (starts < 4 && !angekommen) {
      starts++;
      // Der echte Weg, nicht der bequeme: die Seite wird neu geladen, und
      // was danach passiert, macht ihr eigenes Anmeldeskript.
      try { await seite.goto(adresse, { waitUntil: 'load', timeout: 60000 }); }
      catch { /* das Spiel laedt laenger als der Titel — der steht schon */ }
      await new Promise((f) => setTimeout(f, 4000));
      angekommen = (await seite.title()).includes(KENNZEICHEN);
    }
    console.log(`\n    Neue Fassung        ${angekommen ? `nach ${starts} Start(en) da` : 'nach 4 Starten NICHT da'}   (Zusage: ${STARTS_MAX})`);
    if (!angekommen) {
      M.befund('eine neue Fassung erreicht die abgelegte App auch nach vier Starten nicht — '
        + 'die Auslieferung landet auf der Seite und nie auf dem Geraet.');
    } else if (starts > STARTS_MAX) {
      M.befund(`eine neue Fassung braucht ${starts} Starts statt ${STARTS_MAX}, bis sie auf dem Geraet ankommt.`);
    }
  }
}

await browser.close();
server.close();
M.urteil(`index.html ${(groesse / 1024).toFixed(0)} KB · ${bilder.length} Bilder · ${musik.length} Stuecke ausgelagert.`);

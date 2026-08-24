#!/usr/bin/env node
/*
  Rhythmus-Tafel — hat ein Sektor eine Form, oder ist er eine Rampe?

    node tools/rhythmus.mjs

  Bis v6 erzeugte `tn()` alle Wellen aus einer Formel: Gegnerart reihum aus
  dem Pool, Formation reihum aus der Liste, Anzahl waechst. Alle 120 Sektoren
  teilten sich diese eine Formel. Was dabei nicht entstehen kann, ist genau
  das, was einen Sektor von einer Zahlenreihe unterscheidet: Anstieg,
  Wiedererkennung, ein Moment zum Luftholen.

  Seit v7 wird jeder Sektor aus zwoelf BAUSTEINEN gefuellt, entlang einer
  Druckkurve. Diese Tafel misst, ob dabei wirklich eine Form herauskommt:

    Anstieg       Steigt der Druck ueber den Sektor? (Korrelation mit der
                  Position, muss deutlich positiv sein.)
    Atemzuege     Gibt es Stellen, an denen der Druck spuerbar faellt?
    Vielfalt      Wie viele verschiedene Bausteine, und wiederholt sich
                  einer unmittelbar?
    Dichte        Gegner je Welle — kein Sektor darf leerlaufen.

  WAS DAS NICHT SAGT: ob es sich gut anfuehlt. Das ist hier nicht messbar
  (SKY-001). Rhythmus ist Arithmetik, Spass nicht.
*/
import { existsSync, readFileSync } from 'node:fs';

if (!existsSync('dist/Skyfront.html')) { console.error('✗ dist/Skyfront.html fehlt — erst bauen.'); process.exit(1); }
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.log('  (—) Rhythmus-Tafel: Playwright nicht gefunden — uebersprungen.'); process.exit(2); /* 2 = nicht gemessen, kein Mangel */ }

// Die Druckwerte kommen aus der Quelle, nicht aus dem Kopf.
const quelle = readFileSync('src/app.js', 'utf8');
const bs = /const Bausteine = \[[\s\S]*?\n  \}\];/.exec(quelle);
if (!bs) { console.error('✗ Bausteine nicht in src/app.js gefunden'); process.exit(1); }
const DRUCK = {};
for (const m of bs[0].matchAll(/name: "([^"]+)",\s*\n\s*druck: (\d+)/g)) DRUCK[m[1]] = Number(m[2]);
if (Object.keys(DRUCK).length < 10) { console.error(`✗ nur ${Object.keys(DRUCK).length} Bausteine gelesen`); process.exit(1); }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 } });
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
await seite.waitForFunction(() => window.__SKF_STUFEN, null, { timeout: 90000 });
const stufen = await seite.evaluate(() => window.__SKF_STUFEN.map((s, i) => ({
  nr: i + 1, label: s.label,
  wellen: (s.waves || []).map((w) => ({ b: w.baustein || '?', n: w.count || 0, nr: w.bnr })),
})));
// Das Druckband eines Sektors kommt aus seiner KURVE, nicht aus der Folge,
// die beurteilt werden soll.
//
// Vorher wurden dMin und dMax aus den tatsaechlich gestellten Bausteinen
// gerechnet — das Modell hing am Gemessenen (eiserne Regel 4). Die Folge:
// die Vielfalt-Pruefung war WIRKUNGSLOS. Gegengeprobt, indem die Auswahl auf
// vier der zwoelf Bausteine beschraenkt wurde: null Befunde. Ein Generator,
// der nur vier benutzt, erklaert sein Band selbst zu „vier Bausteinen" und
// besteht.
//
// Gefragt wird jetzt die Kurve des SPIELS, ueber die Naht — nicht die Formel
// hier nachgerechnet.
const baender = await seite.evaluate((n) => {
  const K = window.__SKF_BAUSTEINE && window.__SKF_BAUSTEINE.kurve;
  if (!K) return null;
  const aus = [];
  for (let t = 1; t <= n; t++) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= 40; i++) { const v = K(i / 40, t); if (v < lo) lo = v; if (v > hi) hi = v; }
    aus.push([lo, hi]);
  }
  return aus;
}, 200);
await browser.close();
if (!baender) { console.error('✗ Naht __SKF_BAUSTEINE.kurve fehlt — das Druckband ist nicht zu erreichen. Eine Vielfalt-Pruefung ohne eigenes Band prueft nichts.'); process.exit(1); }

const kor = (a) => {
  const n = a.length; if (n < 3) return 0;
  const mx = (n - 1) / 2, my = a.reduce((x, y) => x + y, 0) / n;
  let s = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { s += (i - mx) * (a[i] - my); dx += (i - mx) ** 2; dy += (a[i] - my) ** 2; }
  return dy === 0 ? 0 : s / Math.sqrt(dx * dy);
};

const ANSTIEG_MIN = 0.25;     // so deutlich muss der Druck ueber den Sektor steigen
const DICHTE_MIN = 3;         // Gegner je Welle, darunter laeuft ein Sektor leer

// Zwei Grenzen, die NICHT gesetzt sind, sondern aus dem Sektor selbst kommen.
//
// Erster Anlauf verlangte flach "mindestens sechs verschiedene Bausteine" und
// meldete 111 Befunde — darunter jeden der ersten zwoelf Sektoren. Zu Recht?
// Nein: bei Sektor 1 reicht die Druckkurve von 0,9 bis 2,7, und in diesem
// Band liegen ueberhaupt nur vier Bausteine. Ein erster Sektor SOLL wenige,
// einfache Begegnungen haben. Die Grenze war falsch, nicht das Spiel.
//
// Gefordert ist deshalb: benutze, was in deinem Druckband liegt.
const VIELFALT_ANTEIL = 0.8;
// Und ein Atemzug ist keine feste Zahl Druckpunkte, sondern ein Einbruch im
// eigenen Band des Sektors — bei Sektor 1 sind 1,5 Punkte fast die ganze
// Spanne, bei Sektor 120 ein Sechstel davon.
const ATEM_TIEFE = 0.35, ATEM_MIN = 2;

const befunde = [];
const zeilen = [];
for (const st of stufen) {
  const w = st.wellen.filter((x) => DRUCK[x.b] != null);
  const folge = [];
  let letzter = '';
  // Zusammengefasst wird nach der BAUSTEININSTANZ (`bnr`), nicht nach dem
  // Namen. Vorher stand hier `if (x.b !== letzter)` — das fasste zwei
  // gleichnamige Bausteine hintereinander zu einem zusammen, und damit war
  // die Wiederholungspruefung drei Zeilen weiter unten TOT: sie verglich
  // Nachbarn in einer Folge, aus der gleiche Nachbarn gerade entfernt worden
  // waren. Gegengeprobt, indem die Wiederholungssperre im Generator
  // ausgebaut wurde: null Befunde. Eine Pruefung, die nie etwas meldet, ist
  // kein Beweis (eiserne Regel 5).
  for (const x of st.wellen) { const k = x.nr === undefined ? x.b : x.nr; if (k !== letzter) { folge.push(x.b); letzter = k; } }
  const druck = w.map((x) => DRUCK[x.b]);
  const anstieg = kor(druck);
  // Atemzug: ein Einbruch gegen die OERTLICHE Umgebung, nicht gegen das
  // Gesamtband. Zwei Anlaeufe haben das gekostet.
  //
  // Erst hiess es "unteres Drittel des Gesamtbandes". Bei einer reinen Rampe
  // liegt der ganze Anfang darunter — die Gegenprobe "Kurve ohne Dellen"
  // blieb gruen, der Test bestand genau bei dem Fehler, den er finden soll.
  //
  // Dann "erst nachdem der Druck oben war". Damit meldete er 93 Sektoren rot:
  // die zweite Delle bei 67 % liegt absolut hoeher als die erste, weil der
  // Anstieg sie mithebt — sie ist trotzdem ein Atemzug, nur eben auf
  // hoeherem Niveau. Ein Einbruch ist relativ, nicht absolut.
  const dMin = Math.min(...druck), dMax = Math.max(...druck);
  const fenster = Math.max(3, Math.round(druck.length * 0.15));
  let atem = 0, letzteStelle = -99;
  for (let i = 1; i < druck.length - 1; i++) {
    let sum = 0, n = 0;
    for (let j = Math.max(0, i - fenster); j <= Math.min(druck.length - 1, i + fenster); j++) { sum += druck[j]; n++; }
    const lokal = sum / n;
    if (druck[i] < lokal * (1 - ATEM_TIEFE) && i - letzteStelle > druck.length * 0.12) { atem++; letzteStelle = i; }
  }
  const verschieden = new Set(folge.filter((x) => DRUCK[x] != null)).size;
  // Wie viele Bausteine liegen ueberhaupt im Druckband dieses Sektors?
  const [kMin, kMax] = baender[st.nr - 1] || [dMin, dMax];
  const erreichbar = Object.values(DRUCK).filter((d) => d >= kMin - 0.5 && d <= kMax + 0.5).length;
  let doppelt = 0;
  for (let i = 1; i < folge.length; i++) if (folge[i] === folge[i - 1]) doppelt++;
  const gegner = st.wellen.reduce((a, x) => a + x.n, 0);
  const dichte = st.wellen.length ? gegner / st.wellen.length : 0;
  zeilen.push({ nr: st.nr, label: st.label, wellen: st.wellen.length, anstieg, atem, verschieden, erreichbar, doppelt, dichte });

  if (anstieg < ANSTIEG_MIN) befunde.push(`Sektor ${st.nr} (${st.label}): Druck steigt kaum (${anstieg.toFixed(2)}, Grenze ${ANSTIEG_MIN}) — das ist eine Rampe, keine Form`);
  if (atem < ATEM_MIN) befunde.push(`Sektor ${st.nr} (${st.label}): nur ${atem} Atemzug/Atemzuege (Grenze ${ATEM_MIN}) — kein Moment zum Luftholen`);
  if (verschieden < Math.max(3, Math.floor(erreichbar * VIELFALT_ANTEIL)))
    befunde.push(`Sektor ${st.nr} (${st.label}): nutzt nur ${verschieden} von ${erreichbar} Bausteinen, die in seinem Druckband liegen`);
  if (doppelt > 0) befunde.push(`Sektor ${st.nr} (${st.label}): ${doppelt}x derselbe Baustein unmittelbar hintereinander`);
  if (dichte < DICHTE_MIN) befunde.push(`Sektor ${st.nr} (${st.label}): nur ${dichte.toFixed(1)} Gegner je Welle (Grenze ${DICHTE_MIN}) — laeuft leer`);
}

const mit = (f) => zeilen.reduce((a, z) => a + f(z), 0) / zeilen.length;
console.log(`Rhythmus-Tafel — ${zeilen.length} Sektoren, ${Object.keys(DRUCK).length} Bausteine\n`);
console.log('  Sektor                  Wellen  Anstieg  Atem  Bausteine  Gegner/Welle');
for (const z of [...zeilen.slice(0, 3), ...zeilen.slice(58, 61), ...zeilen.slice(-3)])
  console.log(`  ${String(z.nr).padStart(3)} ${z.label.slice(0, 20).padEnd(21)} ${String(z.wellen).padStart(5)} ${z.anstieg.toFixed(2).padStart(8)} ${String(z.atem).padStart(5)} ${(z.verschieden + '/' + z.erreichbar).padStart(10)} ${z.dichte.toFixed(2).padStart(13)}`);
console.log(`\n  Mittel ueber alle Sektoren: Anstieg ${mit((z) => z.anstieg).toFixed(2)} · Atemzuege ${mit((z) => z.atem).toFixed(1)} · Bausteine ${mit((z) => z.verschieden).toFixed(1)} · Dichte ${mit((z) => z.dichte).toFixed(2)}`);
console.log(`  Dichte steigt ueber die 120 Sektoren: ${kor(zeilen.map((z) => z.dichte)).toFixed(2)} (unter null hiesse: das Spiel wird duenner, je weiter man kommt)`);

if (kor(zeilen.map((z) => z.dichte)) < 0.2)
  befunde.push(`Die Dichte steigt ueber die 120 Sektoren nicht (${kor(zeilen.map((z) => z.dichte)).toFixed(2)}) — spaeter wird es nicht voller`);

if (befunde.length) {
  console.log(`\nRHYTHMUS ROT — ${befunde.length} Befund(e):`);
  for (const b of befunde.slice(0, 12)) console.log('  · ' + b);
  if (befunde.length > 12) console.log(`  … und ${befunde.length - 12} weitere`);
  process.exit(1);
}
console.log('\nRHYTHMUS GRÜN — jeder Sektor hat Anstieg, Atemzuege und Vielfalt.');

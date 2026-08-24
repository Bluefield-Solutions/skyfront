#!/usr/bin/env node
/*
  Formationentafel — sind die zwoelf Begegnungsbausteine im Bild zwoelf Dinge?

  SKY-030 hat den Wellengenerator durch zwoelf BAUSTEINE ersetzt, jeder „eine
  Idee, die man wiedererkennt". Die Rhythmus-Tafel misst seither, dass ein
  Sektor Anstieg, Atemzuege und Vielfalt hat. Was sie NICHT misst: ob zwei
  Bausteine im Bild ueberhaupt unterschiedlich aussehen. Ein Sektor aus zwoelf
  verschiedenen Namen, die dasselbe Bild erzeugen, waere nach jeder bisherigen
  Zahl gruen.

  Deshalb diese Tafel. Sie rechnet die Bausteine NICHT nach — das waere ein
  Tor, das die Formel nachrechnet, und die haben hier schon einmal nichts
  bewiesen (eiserne Regel 17). Sie laesst `spawnWave()` im laufenden Spiel
  jeden Teil jedes Bausteins wirklich stellen und misst danach, wo die Gegner
  stehen und wann sie kommen.

  Gemessen wird je Baustein eine PUNKTWOLKE in Auslegungspunkten:
      x   quer, 0..540
      y   wie weit vorgeschoben (die Staffelung, die eine Formation ausmacht)
      t   Millisekunden nach dem Beginn des Bausteins

  Verglichen wird paarweise ueber drei Groessen, die ein Spieler wirklich
  auseinanderhaelt:
      Breite     wie viel der Bahn der Baustein einnimmt
      Staffelung wie tief er gestaffelt ist
      Zeitform   ob er auf einmal kommt oder in Schueben

    node tools/formationen.mjs           misst und urteilt
    node tools/formationen.mjs --tafel   zusaetzlich die volle Paartabelle
*/
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const TAFEL = process.argv.includes('--tafel');
const DATEI = process.cwd() + '/dist/Skyfront.html';
const befunde = [];

if (!existsSync(DATEI)) {
  console.error('✗ dist/Skyfront.html fehlt — erst bauen.');
  process.exit(1);
}

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
seite.on('pageerror', (e) => console.error('  SEITE:', String(e).slice(0, 160)));
await seite.goto('file://' + DATEI);
await seite.waitForFunction(() => window.__game && window.__game.scene.scenes.some((x) => x.scene.isActive()), null, { timeout: 90000 });
await seite.waitForTimeout(2500);

// Ins Gefecht — die Naht __SKF_BAUSTEINE wird erst gesetzt, wenn ein
// Sektorplan gebaut wird, und spawnWave braucht ohnehin eine lebende Szene.
const r = await seite.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height }; });
await seite.touchscreen.tap(r.x + 0.5 * r.w, r.y + 0.711 * r.h);
let drin = false;
for (let i = 0; i < 60; i++) {
  if (await seite.evaluate(() => (window.__game.scene.scenes || []).some((x) => x.scene.key === 'Game' && x.scene.isActive()))) { drin = true; break; }
  await seite.waitForTimeout(250);
}
if (!drin) {
  await browser.close();
  console.error('✗ kommt nicht ins Gefecht — nichts gemessen. Eine Tafel ohne Messung ist kein Beweis.');
  process.exit(1);
}
await seite.waitForTimeout(2000);

const gemessen = await seite.evaluate(async () => {
  const g = window.__game, sp = g.scene.getScene('Game');
  const N = window.__SKF_BAUSTEINE;
  if (!N) return { fehler: 'Naht __SKF_BAUSTEINE fehlt — die Bausteine sind nicht zu erreichen' };
  // DIE UHR DES SPIELS SELBST ANTREIBEN.
  //
  // `sideSweep` und `stream` stellen ueber `delayedCall`. Auf ein Warten kann
  // man sich dabei nicht verlassen, und zwar aus zwei Gruenden, die beide
  // gemessen sind:
  //
  //   Das Spiel laeuft hier mit 5 bis 7 Bildern — SwiftShader, keine
  //   Grafikkarte. Und `TimeStep.smoothDelta` nagelt `loop.delta` ohne
  //   Fensterfokus auf 16,667 ms fest. `time.now` laeuft dadurch in
  //   ECHTZEIT, die Zeitereignisse aber in DELTA-Zeit: nach 1900 ms
  //   Wanduhr waren 1900 ms auf `time.now` vergangen — und trotzdem hingen
  //   fuenf von sechs Ereignissen noch, weil erst 150 ms Delta-Zeit
  //   zusammengekommen waren.
  //
  // Zwei Anlaeufe sind daran gescheitert: Warten auf die Wanduhr (neun von
  // zwoelf Gegnern der Zange fehlten) und Warten auf `time.now` (immer noch
  // vier Bausteine unvollstaendig, und die Zahlen schwankten von Lauf zu
  // Lauf). Beides sah aus wie ein schmalerer Baustein, nicht wie ein
  // Messfehler — genau die Sorte Zahl, die eine Tafel wertlos macht.
  //
  // Jetzt bekommt die Ereignisverwaltung des Spiels ihre Zeit von uns.
  // Nachgerechnet wird nichts: `spawnWave` stellt weiterhin selbst, wir
  // liefern nur die Uhr.
  const treibe = (ms, d = 50) => {
    let t = sp.time.now;
    for (let i = 0; i < Math.ceil(ms / d); i++) { t += d; sp.time.preUpdate(t, d); sp.time.update(t, d); }
  };

  // Die Szene soll uns nicht dazwischenfunken: keine eigenen Wellen, kein
  // Schaden, keine Bewegung der schon gestellten Gegner.
  sp.waveIndex = 1e9;
  sp.physics.world.pause();

  const raeumen = () => sp.enemies.getChildren().slice().forEach((e) => { if (e.active) e.disableBody(true, true); });

  // Welche Art fuellt welche Rolle? Genau wie im Spiel: aus dem Pool des
  // Sektors. Wir nehmen den Pool, den die Szene gerade hat.
  const pool = (sp.enemyPool && sp.enemyPool.length) ? sp.enemyPool
    : Object.keys(window.__SKF_GEGNER);
  const rollen = { schwarm: [], stuerzer: [], schuetze: [], panzer: [] };
  for (const k of pool) { const b = window.__SKF_GEGNER[k] && window.__SKF_GEGNER[k].rolle; if (b && rollen[b]) rollen[b].push(k); }
  for (const k of Object.keys(rollen)) if (!rollen[k].length) rollen[k] = rollen.schwarm.length ? rollen.schwarm.slice() : pool.slice();

  // GEMESSEN WIRD DIE STELLUNG, NICHT WER UEBERLEBT.
  //
  // Der erste Anlauf zaehlte hinterher die noch aktiven Gegner. Fuer die
  // Zange kamen dabei ZWEI Stueck bei Breite 0,00 heraus statt zwoelf von
  // beiden Seiten: `sideSweep` setzt seine Gegner ausserhalb des Bildes ab
  // (x = -40 bzw. 580) und laesst sie hereinfliegen — mit angehaltener Physik
  // fliegen sie nie herein und werden als „draussen" abgeraeumt. Die Zahl war
  // dann eine Aussage ueber das Abraeumen, nicht ueber die Formation.
  //
  // Jetzt werden `spawnAt` und `spawnSide` beim Aufruf mitgeschrieben. Das
  // ist immer noch die Rechnung des SPIELS — nur an der Stelle abgelesen, an
  // der sie entsteht, statt an ihrem Nachleben.
  const echtAt = sp.spawnAt.bind(sp), echtSide = sp.spawnSide.bind(sp);
  let mit = null;
  sp.spawnAt = (kind, x, vor) => { mit && mit.push({ x, y: vor, t: Math.round(performance.now() - mit.t0) }); return echtAt(kind, x, vor); };
  sp.spawnSide = (kind, links, y) => { mit && mit.push({ x: links ? -40 : 580, y, t: Math.round(performance.now() - mit.t0) }); return echtSide(kind, links, y); };

  const aus = [];
  for (const bs of N.bausteine) {
    raeumen();
    const wolke = [];
    for (const teil of bs.teile) {
      const art = rollen[teil.rolle][0];
      const kl = window.__SKF_GEGNER[art].cls;
      // Genau die Rechnung des Spiels: die Groessenklasse sagt die Stueckzahl.
      const anzahl = Math.max(1, Math.round(teil.n / N.gruppe[teil.rolle] * N.klasse[kl]));
      // `single` stellt EINEN, was auch immer in `count` steht — das ist der
      // Vertrag der Formation, kein Fehlbestand. Ein erster Anlauf verglich
      // gegen `anzahl` und meldete die Eskorte als unvollstaendig.
      const erwartet = teil.form === 'single' ? 1 : anzahl;
      mit = []; mit.t0 = performance.now();
      sp.spawnWave({ kind: art, count: anzahl, formation: teil.form });
      // sideSweep und stream stellen ueber delayedCall. Gewartet wird genau
      // so lange, wie die Formation braucht — in SPIELZEIT, und nicht
      // laenger: unter SwiftShader ist eine Sekunde Spielzeit rund acht
      // Sekunden Wanduhrzeit, und zu grosszuegig gewartet laeuft der Lauf in
      // die Notbremse statt in die Messung.
      // Wie lange braucht die Formation, bis sie alle gestellt hat? Steht
      // hier je Formation, weil `pincer` paarweise stellt und deshalb nur
      // halb so viele Schritte braucht wie Gegner.
      const schritt = teil.form === 'sideSweep' ? 150
        : teil.form === 'stream' ? 280
        : teil.form === 'pincer' ? 220 / 2
        : 0;
      treibe(schritt * erwartet + 400);
      for (const q of mit) wolke.push({ x: q.x, y: q.y, t: q.t + teil.nach, teil: teil.form, erwartet });
      const fehlt = erwartet - mit.length;
      if (fehlt > 0) wolke.fehlend = (wolke.fehlend || 0) + fehlt;
      mit = null;
    }
    aus.push({ name: bs.name, druck: bs.druck, wolke, fehlend: wolke.fehlend || 0 });
  }
  sp.spawnAt = echtAt; sp.spawnSide = echtSide;
  raeumen();
  sp.physics.world.resume();
  return { bausteine: aus, feldBreite: 540, offen: sp.time._active.length };
});

await browser.close();

if (gemessen.fehler) { console.error('✗ ' + gemessen.fehler); process.exit(1); }
// Ereignisse, die am Ende noch haengen, gehoeren zu einem Baustein, der
// nicht fertig gestellt hat — und ein halb gemessener Baustein sieht aus wie
// ein schmalerer.
if (gemessen.offen > 2)
  befunde.push(`${gemessen.offen} Zeitereignisse haengen am Ende noch — die Uhr wurde nicht weit genug getrieben, die Messung ist unvollstaendig.`);

/* ---------- die drei Kennzahlen je Baustein ---------------------------- */

const B = gemessen.feldBreite;
const kennzahlen = (w) => {
  if (!w.length) return null;
  const xs = w.map((p) => p.x), ys = w.map((p) => p.y), ts = w.map((p) => p.t);
  const spanne = (a) => Math.max(...a) - Math.min(...a);
  return {
    n: w.length,
    breite: spanne(xs) / B,                       // 0..1, Anteil der Bahn
    staffel: spanne(ys) / B,                      // in derselben Einheit
    zeit: spanne(ts),                             // ms
    // Wie GLEICHMAESSIG steht er quer? Eine Reihe ist gleichmaessig, ein
    // Keil dichter in der Mitte. Gemessen als mittlerer Abstand zum
    // Mittelpunkt, auf die Breite bezogen.
    mitte: xs.length < 2 ? 0 : xs.reduce((s, x) => s + Math.abs(x - B / 2), 0) / xs.length / B,
  };
};

const daten = gemessen.bausteine.map((b) => ({ ...b, k: kennzahlen(b.wolke) }));
const leer = daten.filter((d) => !d.k);
for (const d of leer) befunde.push(`${d.name}: kein einziger Gegner gestellt — der Baustein ist im Bild nicht da`);
// Ein Baustein, der weniger stellt als er ansagt, ist nicht gemessen, sondern
// halb gemessen — und das sieht aus wie ein schmalerer Baustein.
for (const d of daten)
  if (d.fehlend) befunde.push(`${d.name}: ${d.fehlend} angesagte(r) Gegner nie gestellt — die Messung dieses Bausteins ist unvollstaendig`);

console.log('Gemessen an spawnWave() im laufenden Gefecht, Feld 540 Auslegungspunkte:\n');
console.log('  Baustein        Druck   n   Breite  Staffel  Zeit(ms)  Schwerpkt');
for (const d of daten) {
  if (!d.k) { console.log(`  ${d.name.padEnd(14)} ${String(d.druck).padStart(5)}   —  (nichts gestellt)`); continue; }
  console.log(`  ${d.name.padEnd(14)} ${String(d.druck).padStart(5)} ${String(d.k.n).padStart(3)}   ${d.k.breite.toFixed(2)}    ${d.k.staffel.toFixed(2)}    ${String(d.k.zeit).padStart(5)}     ${d.k.mitte.toFixed(2)}`);
}

/* ---------- Paarvergleich ---------------------------------------------- */

// Zwei Bausteine sind DASSELBE BILD, wenn sie in allen vier Groessen nah
// beieinander liegen. Woran gemessen?
//
// Der erste Anlauf normierte auf die STREUUNG des gemessenen Feldes. Das ist
// genau der Fehler aus eiserner Regel 4 — das Modell hing am Gemessenen —,
// und die Gegenprobe hat ihn sofort aufgedeckt: der Eingriff „Keil ohne
// Staffelung" machte die Tafel rot, aber mit einem Befund ueber DECKUNG UND
// EESKORTE. Weil die Staffelung des Keils die Streuung dieser Achse traegt,
// verschob sein Wegfall alle Paarabstaende auf einmal. Ein Tor, das bei einer
// Aenderung an A einen Befund ueber B und C meldet, ist unbrauchbar — es war
// rot, die Probe zaehlte als bestanden, und bewiesen war nichts.
//
// Jetzt kommen die Massstaebe aus dem SPIEL. Es sind die Schrittweiten, die
// spawnWave selbst benutzt, wenn es „eine Position weiter" meint:
//
//     62 Auslegungspunkte   seitlicher Schritt im Keil (vWedge)
//     46 Auslegungspunkte   Schritt in der Tiefe im Keil
//    400 Millisekunden      kleinster Versatz `nach` in der Bausteinliste
//
// Ein Abstand von 1,0 heisst damit: die beiden unterscheiden sich um so viel,
// wie im Spiel ein Gegner vom naechsten entfernt steht. Darunter ist es
// dasselbe Bild.
const gut = daten.filter((d) => d.k);
const SCHRITT_QUER = 62 / B, SCHRITT_TIEF = 46 / B, SCHRITT_ZEIT = 400;
const abstand = (a, b) => Math.sqrt(
  ((a.breite - b.breite) / SCHRITT_QUER) ** 2 +
  ((a.staffel - b.staffel) / SCHRITT_TIEF) ** 2 +
  ((a.zeit - b.zeit) / SCHRITT_ZEIT) ** 2 +
  ((a.mitte - b.mitte) / SCHRITT_QUER) ** 2);

const ABSTAND_MIN = 1;
const paare = [];
for (let i = 0; i < gut.length; i++)
  for (let j = i + 1; j < gut.length; j++)
    paare.push({ a: gut[i], b: gut[j], d: abstand(gut[i].k, gut[j].k) });
paare.sort((x, y) => x.d - y.d);

console.log(`\nPaarabstand in Schrittweiten des Spiels (62 quer / 46 tief / 400 ms) (Grenze ${ABSTAND_MIN}); die zehn engsten:`);
for (const p of (TAFEL ? paare : paare.slice(0, 10)))
  console.log(`  ${p.d.toFixed(2).padStart(5)}  ${p.a.name.padEnd(14)} ${p.b.name}`);

for (const p of paare)
  if (p.d < ABSTAND_MIN)
    befunde.push(`${p.a.name} und ${p.b.name} erzeugen dasselbe Bild (Abstand ${p.d.toFixed(2)} < ${ABSTAND_MIN}): Breite ${p.a.k.breite.toFixed(2)}/${p.b.k.breite.toFixed(2)}, Staffel ${p.a.k.staffel.toFixed(2)}/${p.b.k.staffel.toFixed(2)}, Zeit ${p.a.k.zeit}/${p.b.k.zeit} ms`);

console.log('');
if (befunde.length) {
  console.log(`FORMATIONEN ROT — ${befunde.length} Befund(e):`);
  for (const b of befunde) console.log('  · ' + b);
  process.exit(1);
}
console.log('FORMATIONEN GRÜN — die zwölf Bausteine sind im Bild zwölf Dinge.');

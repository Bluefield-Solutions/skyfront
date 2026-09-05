#!/usr/bin/env node
/*
  Messtafel — laeuft die Messung auch dann, wenn niemand hinsieht?

    node tools/messtafel.mjs

  DER ANLASS, woertlich vom Nutzer:

    „Kannst du mir für die Messung zuerstens im Spiel oben einen kleinen
     Button einbauen, ‚Messungen anschalten‘ … Dann soll die Messung im
     Hintergrund laufen, oder ich mach es mit einem Aufklappmechanismus,
     um dann ablesen zu können. Da vielleicht noch ein Button rein, wo ich
     dann alles mit rauskopieren kann."

  Knopf, Aufklappen und Kopieren gab es schon. Was es NICHT gab, ist der
  Kern der Bitte: die Schleife stieg bei geschlossener Tafel sofort aus —

      if (!an) { vorher = t; return; }

  Wer die Tafel zuklappte, um zu spielen, hat damit die Messung
  abgeschaltet. Und der Fall, in dem man misst, ist genau der: spielen und
  dabei messen.

  WAS GEMESSEN WIRD, an der gebauten Datei im Browser, bei 390 x 844:

    A  aus       nichts zu sehen, keine Kopierzeile
    B  an        der Streifen steht da, die Messung laeuft
    C  eingeklappt  die Bilderzahl STEIGT weiter — der eigentliche Punkt
    D  aufklappen   setzt NICHT zurueck (sonst wirft das Ablesen weg,
                    was man ablesen wollte)
    E  Kopieren  die Zeile traegt Version und Zahlen
    F  Neuladen  der Schalter ueberlebt es

  UND DER TAKT. Bis v61 schaetzte die Tafel den Bildschirmtakt aus dem
  MEDIAN, also aus dem, was das Spiel gerade schafft. Hier laeuft es unter
  SwiftShader mit rund drei Bildern je Sekunde — daraus wurde „~3 Hz", das
  Budget 533 ms, und ein p95 von 350 ms stand GRUEN da. Eine Tafel, die
  bei einem Einbruch mitgeht, bezeugt ihn, statt ihn zu melden. Der Takt
  kommt jetzt aus den SCHNELLSTEN Bildern; reicht auch das nicht, sagt sie
  „unbekannt" und misst gegen 60 Hz. Genau das wird hier geprueft — und es
  ist die einzige Pruefung dieses Projekts, der die lahme Umgebung NUETZT.

      J  Ruhe     Waehrend der Messung ruehrt sich die Tafel nicht: sie ist
              unsichtbar und wird nicht geschrieben. Beim Ausschalten
              fuellt sie sich.
    K  Ecke     Die Vier-Tipp-Ecke liegt auf Pause und Ton. Im Gefecht
              darf sie nicht zaehlen, ausserhalb muss sie es.
    L  Pause    Eine Pause darf die Messung nicht wegwerfen, ein neuer
              Lauf muss es.

  `--ohne-naht` nimmt `__SKF_MESSZEILE` weg und verlangt die Rueckgabe 2.
*/
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Messtafel', 'ein Schalter an, spielen, ein Schalter aus, kopieren — und dazwischen liegt nichts ueber der Leinwand.');

if (!existsSync('dist/Skyfront.html')) M.abbruch('dist/Skyfront.html fehlt — erst bauen.');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.abbruch('Playwright nicht gefunden.'); }

const TYP = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const server = createServer((an, aw) => {
  const pfad = decodeURIComponent(an.url.split('?')[0]);
  const datei = join('dist', normalize(pfad).replace(/^(\.\.[/\\])+/, ''));
  if (!existsSync(datei) || statSync(datei).isDirectory()) { aw.writeHead(404).end(); return; }
  const roh = readFileSync(datei);
  aw.writeHead(200, { 'Content-Type': TYP[extname(datei)] || 'application/octet-stream', 'Content-Length': roh.length }).end(roh);
});
await new Promise((f) => server.listen(0, '127.0.0.1', f));
const adresse = `http://127.0.0.1:${server.address().port}/Skyfront.html`;

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
// NICHT bei jedem Laden zuruecksetzen: addInitScript laeuft auch beim
// Neuladen, und Pruefung G will gerade wissen, ob der Schalter das
// ueberlebt. Ein erster Anlauf hat sich so selbst einen Befund gebaut.
await seite.addInitScript(() => { try { localStorage.setItem('seen_tut', '1'); } catch (e) {} });
await seite.goto(adresse);
await seite.waitForFunction(() => window.__game && window.__bootStats && window.__bootStats.totalMs, null, { timeout: 90000 });
await seite.waitForTimeout(1200);
if (OHNE_NAHT) await seite.evaluate(() => { delete window.__SKF_MESSZEILE; });

// Ins Gefecht, gerufen statt getippt (Regel 46). Im Menue laeuft nichts,
// was zu messen waere.
const drin = await seite.evaluate(async () => {
  const g = window.__game;
  (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
  g.scene.start('Game', { stage: 3 });
  for (let i = 0; i < 40; i++) {
    await new Promise((f) => setTimeout(f, 250));
    const sz = (g.scene.scenes || []).find((s) => s.scene.key === 'Game' && s.scene.isActive());
    if (!sz) continue;
    if (!sz.stageStarted && typeof sz.startStage === 'function') sz.startStage();
    if (sz.player) return true;
  }
  return false;
});
if (!drin) { await browser.close(); server.close(); M.abbruch('kommt nicht ins Gefecht.'); }
await seite.waitForTimeout(1500);

const stand = () => seite.evaluate(() => {
  const t = document.getElementById('messung'), w = document.getElementById('messwerte');
  return {
    an: typeof window.__SKF_MESSAN === 'function' ? window.__SKF_MESSAN() : null,
    klasse: t ? t.className : null,
    text: w ? String(w.textContent || '') : '',
    knoepfe: [...document.querySelectorAll('#messknoepfe .knopf')].map((k) => k.textContent.trim()),
    zeile: typeof window.__SKF_MESSZEILE === 'function' ? String(window.__SKF_MESSZEILE()) : null,
  };
});
const tippen = (tat) => seite.evaluate((tat) => {
  const k = document.querySelector('[data-tat="' + tat + '"]');
  if (!k) return false;
  k.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  return true;
}, tat);
// Ueber die Naht, nicht ueber den Schirm: eingeklappt steht die
// Bilderzahl nirgends, und gerade eingeklappt soll sie geprueft werden.
const bilder = () => seite.evaluate(() => typeof window.__SKF_MESSBILDER === 'function' ? window.__SKF_MESSBILDER() : null);

// Was jede der zwoelf Pruefungen kostet.
//
// Der Anlass: dieses Tor traegt 40 % des ganzen Probensatzes — zehn Proben
// haengen daran, jede kostet 158 s. Bevor irgendetwas gekuerzt wird, muss
// dastehen, WO die Zeit liegt; sonst wird an der falschen Stelle gespart
// und die Empfindlichkeit ist weg, ohne dass die Zeit faellt.
//
// Fuenfundvierzig Sekunden stehen als feste Wartezeiten im Quelltext. Wo
// die uebrigen liegen, sagt keine Datei — also misst das Tor es selbst.
const taktStart = Date.now();
let taktLetzt = taktStart;
const takte = [];
const takt = (name) => {
  const jetzt = Date.now();
  takte.push([name, (jetzt - taktLetzt) / 1000]);
  taktLetzt = jetzt;
};

console.log('Messtafel\n');
console.log('  gemessen am gebauten Spiel, 390 x 844 (iPhone hochkant)\n');
let gemessen = 0;

// ---- A  aus ------------------------------------------------------------
{
  const s = await stand();
  if (s.an === null) M.ungemessen('__SKF_MESSAN fehlt — der Schalter ist nicht abzufragen.');
  else {
    gemessen++;
    console.log(`  A  aus            an=${s.an}  Klasse=${JSON.stringify(s.klasse)}`);
    if (s.an) M.befund('die Messtafel ist von selbst an — sie soll ausgeschaltet starten.');
    if (s.klasse) M.befund(`die Tafel ist sichtbar, obwohl nicht gemessen wird (Klasse ${JSON.stringify(s.klasse)}).`);
  }
}

takt('A  aus');

// ---- B  anschalten -----------------------------------------------------
await seite.evaluate(() => { window.__SKF_MESSTAFEL && window.__SKF_MESSTAFEL(); });
await seite.waitForTimeout(6000);
{
  const s = await stand();
  gemessen++;
  console.log(`  B  an             an=${s.an}  Klasse=${JSON.stringify(s.klasse)}  Knöpfe ${JSON.stringify(s.knoepfe)}`);
  if (!s.an) M.befund('der Knopf schaltet die Messung nicht an.');
  // EIN SCHALTER, KEIN AUFKLAPPER (v73, woertlich vom Nutzer): waehrend
  // der Messung liegt NICHTS ueber der Leinwand. Bis v72 stand dort ein
  // Streifen, den man erst wegklappen musste, um zu spielen.
  if (s.klasse) M.befund(`waehrend der Messung liegt etwas ueber der Leinwand (Klasse ${JSON.stringify(s.klasse)}). Gespielt wird jetzt, nicht abgelesen — sichtbar sein soll nur der gruene Ring am Knopf.`);
  if (s.knoepfe.length) M.befund(`waehrend der Messung stehen Knoepfe da (${JSON.stringify(s.knoepfe)}). Der einzige Knopf, den es dann braucht, ist der im Spiel.`);
}

takt('B  anschalten');

// ---- C  eingeklappt weitermessen — DER PUNKT --------------------------
// GEWARTET WIRD AUF DIE BEDINGUNG, NICHT AUF DIE UHR.
//
// Erst standen hier neun Sekunden, dann fuenfzehn — beide an DIESER
// Umgebung geeicht. Auf dem Laeufer von GitHub reichten auch fuenfzehn
// nicht: die Tafel gibt erst ab 60 Proben eine Zahl heraus, und dort
// kommen noch weniger Bilder zusammen. Ergebnis: „nicht gemessen", und
// im strengen Lauf ist das ein Fehlschlag. Eine feste Sekundenzahl ist
// eine absolute Grenze in Verkleidung (Regel 2).
//
// Gefragt wird jetzt die TAFEL SELBST, ob sie reif ist — ihr eigenes
// Kriterium, nicht ein hier nachgebautes (Regel 17). Die Obergrenze ist
// nur eine Reissleine.
const vorher = await bilder();
// Und ein zweites Abbruchkriterium: STEHT die Bilderzahl, ist die Messung
// kaputt — dann muss das Tor das melden und nicht anderthalb Minuten
// darauf warten, dass eine tote Messung reif wird. Genau diesen Fall
// stellt die Gegenprobe „misst nur, solange sie offen ist" her.
const reifWarten = async (grenzeMs) => {
  const bis = Date.now() + grenzeMs;
  let letzte = await bilder(), steht = 0;
  while (Date.now() < bis) {
    await seite.waitForTimeout(1000);
    const z = await seite.evaluate(() => typeof window.__SKF_MESSZEILE === 'function' ? String(window.__SKF_MESSZEILE()) : null);
    if (z === null) return false;                     // ohne Naht: nicht wartbar
    if (!/NOCH NICHTS GEMESSEN/.test(z)) return true;
    const jetzt = await bilder();
    steht = (jetzt != null && letzte != null && jetzt > letzte) ? 0 : steht + 1;
    letzte = jetzt;
    if (steht >= 8) return false;                     // die Messung steht
  }
  return false;
};
const reif = await reifWarten(90000);
const nachher = await bilder();
{
  gemessen++;
  console.log(`  C  eingeklappt    Bilder ${vorher} → ${nachher}   (Tafel reif: ${reif ? 'ja' : 'nein'})`);
  if (vorher == null || nachher == null) M.ungemessen('die Bilderzahl steht nicht in der Tafel — nicht gemessen.');
  else if (!(nachher > vorher)) M.befund(`eingeklappt steigt die Bilderzahl nicht (${vorher} → ${nachher}). Die Messung laeuft nur, solange man hinsieht — und der Fall, in dem man misst, ist genau der andere.`);
}

takt('C  eingeklappt messen');

// ---- D  ausschalten zeigt das Ergebnis, ohne es wegzuwerfen ----------
if (!await seite.evaluate(() => { window.__SKF_MESSTAFEL(); return true; })) M.ungemessen('der Schalter ist nicht zu erreichen.');
else {
  await seite.waitForTimeout(1500);
  const s = await stand(), nach = await bilder();
  gemessen++;
  console.log(`  D  ausgeschaltet  an=${s.an}  Klasse=${JSON.stringify(s.klasse)}  Bilder ${nach}  Knöpfe ${JSON.stringify(s.knoepfe)}`);
  if (s.an) M.befund('der zweite Druck schaltet die Messung nicht aus.');
  if (!s.klasse) M.befund('nach dem Ausschalten steht kein Ergebnis da. Dann war die Messung umsonst.');
  for (const w of ['Kopieren', 'Neu messen', 'Schliessen'])
    if (!s.knoepfe.some((k) => k.includes(w))) M.befund(`im Ergebnis fehlt der Knopf „${w}" (${JSON.stringify(s.knoepfe)}).`);
  if (nach != null && nachher != null && nach < nachher) M.befund(`das Ausschalten wirft die Messung weg (${nachher} → ${nach} Bilder). Genau die will man danach lesen.`);
  // Und die Uhr muss stehen: sonst waechst die Laufzeit im Ergebnis
  // weiter, obwohl nichts mehr gemessen wird.
  const t1 = (s.text.match(/(\d+) s\s+\d+ Bilder/) || [])[1];
  await seite.waitForTimeout(2500);
  const t2 = ((await stand()).text.match(/(\d+) s\s+\d+ Bilder/) || [])[1];
  console.log(`     Laufzeit im Ergebnis  ${t1} s → ${t2} s`);
  if (t1 != null && t2 != null && Number(t2) > Number(t1))
    M.befund(`die Laufzeit waechst im Ergebnis weiter (${t1} s → ${t2} s), obwohl nicht mehr gemessen wird.`);
}

takt('D  ausschalten');

// ---- E  die Kopierzeile ------------------------------------------------
{
  const s = await stand();
  if (s.zeile === null) M.ungemessen('__SKF_MESSZEILE fehlt — die Kopierzeile ist nicht zu lesen.');
  else {
    gemessen++;
    console.log(`  E  Kopierzeile    ${s.zeile.slice(0, 96)}…`);
    if (!/^SKYFRONT-MESSUNG v\d+/.test(s.zeile)) M.befund(`die Kopierzeile nennt die Version nicht: ${JSON.stringify(s.zeile.slice(0, 60))}`);
    // „Noch nichts gemessen" ist hier KEIN Befund: unter SwiftShader kommen
    // in der Messzeit nicht immer 60 Bilder zusammen. Es ist aber auch kein
    // bestandener Satz — also nicht gemessen.
    if (/NOCH NICHTS GEMESSEN/.test(s.zeile)) M.ungemessen('die Kopierzeile ist noch nicht reif — in dieser Umgebung kommen zu wenige Bilder zusammen.');
    else if (!/p50 .* p95 /.test(s.zeile)) M.befund(`die Kopierzeile traegt keine Bildzeiten: ${JSON.stringify(s.zeile.slice(0, 90))}`);
  }
}

takt('E  Kopierzeile');

// ---- F  der Takt darf beim Einbruch nicht mitgehen --------------------
//
// Hier rechnet SwiftShader mit rund drei Bildern je Sekunde. Genau dann
// muss die Tafel sagen, dass sie den Bildschirmtakt NICHT kennt — und
// darf ein p95 von 350 ms nicht gruen faerben.
{
  const s = await stand();
  gemessen++;
  const zeileTakt = (s.text.match(/Anzeige[^\n]*/) || ['(keine)'])[0];
  console.log(`  F  Takt           ${zeileTakt.trim()}`);
  const langsam = /(\d+[.,]\d)\/s/.test(s.text) ? parseFloat(s.text.match(/([\d.,]+)\/s/)[1].replace(',', '.')) < 20 : false;
  if (langsam && !/unbekannt/.test(s.text) && !/—/.test(zeileTakt))
    M.befund(`bei ${s.text.match(/([\d.,]+)\/s/)[1]} Bildern je Sekunde behauptet die Tafel einen Bildschirmtakt: ${JSON.stringify(zeileTakt.trim())}. Der Takt gehoert zum Bildschirm, nicht zur Leistung.`);
}

takt('F  Takt');

// ---- G  der Schalter ueberlebt ein Neuladen ---------------------------
// Vorher wieder ANSCHALTEN: Pruefung D hat ihn ausgemacht, und geprueft
// werden soll, ob ein LAUFENDER Schalter das Neuladen uebersteht.
await seite.evaluate(() => { if (!window.__SKF_MESSAN()) window.__SKF_MESSTAFEL(); });
await seite.waitForTimeout(800);
await seite.reload();
await seite.waitForFunction(() => window.__game, null, { timeout: 90000 });
await seite.waitForTimeout(2500);
{
  const s = await stand();
  gemessen++;
  console.log(`  G  nach Neuladen  an=${s.an}  Klasse=${JSON.stringify(s.klasse)}`);
  if (s.an === null) M.ungemessen('nach dem Neuladen ist __SKF_MESSAN nicht da.');
  else if (!s.an) M.befund('nach einem Neuladen ist die Messung aus. Eine Messung, die beim Nachladen still ausgeht, ist keine.');
}

takt('G  Neuladen');

// ---- H  Waehrend der Messung liegt NICHTS ueber der Leinwand ---------
//
// DER ANLASS, woertlich: „der Aufklapper stoert total das Fliegen" (v63)
// und dann „Ich haette gern oben einfach so einen Anschalter" (v73). Bis
// v72 stand waehrend der Messung ein Streifen ueber dem Spiel, den man
// durchlaessig machen musste. Seit v73 steht dort gar nichts — und das
// laesst sich schaerfer pruefen als Durchlaessigkeit: an keiner Stelle
// der Leinwand darf etwas anderes liegen als die Leinwand.
console.log('\n  H  Liegt waehrend der Messung etwas ueber der Leinwand?');
{
  await seite.evaluate(async () => {
    const g = window.__game;
    (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
    g.scene.start('Game', { stage: 3 });
    for (let i = 0; i < 40; i++) {
      await new Promise((f) => setTimeout(f, 250));
      const sz = (g.scene.scenes || []).find((s) => s.scene.key === 'Game' && s.scene.isActive());
      if (!sz) continue;
      if (!sz.stageStarted && typeof sz.startStage === 'function') sz.startStage();
      if (sz.player) return;
    }
  });
  await seite.evaluate(() => { if (!window.__SKF_MESSAN()) window.__SKF_MESSTAFEL(); });
  await seite.waitForTimeout(1500);
  const fremd = await seite.evaluate(() => {
    const lw = document.querySelector('canvas');
    if (!lw) return { fehler: 'keine Leinwand' };
    const r = lw.getBoundingClientRect();
    const raus = [];
    for (const [nx, ny] of [[.5, .2], [.5, .5], [.5, .8], [.2, .9], [.8, .9], [.5, .95]]) {
      const x = Math.round(r.left + r.width * nx), y = Math.round(r.top + r.height * ny);
      const e = document.elementFromPoint(x, y);
      const wer = e ? (e.id || e.tagName) : 'nichts';
      if (wer !== 'CANVAS') raus.push(`(${x},${y}) → ${wer}`);
    }
    return { raus, an: window.__SKF_MESSAN(), klasse: document.getElementById('messung').className };
  });
  if (fremd.fehler) M.ungemessen(`Leinwand: ${fremd.fehler}`);
  else {
    gemessen++;
    console.log(`     an=${fremd.an}  Klasse=${JSON.stringify(fremd.klasse)}  Fremdes an sechs Stellen: ${fremd.raus.length ? fremd.raus.join(' · ') : 'nichts'}`);
    if (fremd.raus.length)
      M.befund(`waehrend der Messung liegt etwas ueber der Leinwand: ${fremd.raus.join(' · ')}. Gespielt wird waehrend der Messung — was dort liegt, faengt Finger.`);
  }
}

takt('H  ueber der Leinwand');

// ---- I  Kommt die Effekt-Absenkung je zurueck? ------------------------
//
// GEMESSEN AM GERAET, Sektor 106: 55,6 Bilder je Sekunde, Effektbudget
// 0,35 nach 88 Sekunden. Der Regler senkte unter 46 und hob erst ueber
// 56 — dazwischen ein totes Band von zehn Bildern, und genau darin lebt
// ein 60-Hz-Telefon in einem vollen Sektor. Er konnte nicht mehr
// hochkommen und blieb den ganzen Sektor unten, auch wenn es laengst
// wieder ruhig war.
//
// Gefragt wird die REGEL, nicht die Umgebung: hier laeuft SwiftShader mit
// drei Bildern je Sekunde, da kaeme jeder Regler an den Boden. Die Naht
// __SKF_QREGEL gibt die Entscheidung heraus, ohne dass jemand achtzig
// Sekunden spielen muss.
console.log('\n  I  Effekt-Absenkung: kommt sie zurück?');
{
  const faelle = [
    { name: 'tiefer Einbruch  30/s bei 60 Hz', q: 1, fps: 30, takt: 60, soll: 'runter' },
    { name: 'knapp am Takt    55,6/s bei 60 Hz', q: .35, fps: 55.6, takt: 60, soll: 'hoch' },
    { name: 'satt am Takt     59/s bei 60 Hz', q: .5, fps: 59, takt: 60, soll: 'hoch' },
    { name: 'schon oben       59/s, q=1', q: 1, fps: 59, takt: 60, soll: 'bleibt' },
    { name: 'Grauzone         50/s bei 60 Hz', q: .5, fps: 50, takt: 60, soll: 'bleibt' },
    { name: '120 Hz, 111/s', q: .35, fps: 111, takt: 120, soll: 'hoch' },
    { name: '120 Hz, 80/s', q: 1, fps: 80, takt: 120, soll: 'runter' },
    // UND DAS FALLEN BRAUCHT DIESELBE BREMSE WIE DAS STEIGEN.
    // Gemessen auf dem Geraet, SEKTOR 1: 58,8 Bilder je Sekunde, 89 % der
    // Bilder unter 17 ms — und trotzdem `Q 0.15`. Ein Ruckler von 90 ms
    // hat gereicht: die Regel laeuft dreimal je Sekunde und schob den
    // Regler ungebremst auf den Boden.
    { name: 'kurzer Ruckler, eben erst gefallen', q: 1, fps: 30, takt: 60, b: 1000, I: 700, soll: 'bleibt' },
    { name: 'anhaltend langsam, Bremse abgelaufen', q: 1, fps: 30, takt: 60, b: 2000, I: 700, soll: 'runter' },
  ];
  const r = await seite.evaluate((faelle) => {
    if (typeof window.__SKF_QREGEL !== 'function') return { fehler: '__SKF_QREGEL fehlt' };
    return {
      raus: faelle.map((f) => {
        const e = window.__SKF_QREGEL(f.q, f.fps, f.takt, f.b == null ? 100000 : f.b, f.I == null ? 0 : f.I);
        return { name: f.name, soll: f.soll, vor: f.q, nach: e.q,
                 tat: e.q > f.q ? 'hoch' : e.q < f.q ? 'runter' : 'bleibt' };
      }),
    };
  }, faelle);
  if (r.fehler) M.ungemessen(`Q-Regler: ${r.fehler}`);
  else {
    gemessen++;
    for (const f of r.raus) {
      console.log(`     ${f.name.padEnd(34)} ${f.vor.toFixed(2)} → ${f.nach.toFixed(2)}   ${f.tat}`);
      if (f.tat !== f.soll)
        M.befund(`Effekt-Absenkung, „${f.name.trim()}": erwartet ${f.soll}, tatsaechlich ${f.tat} (${f.vor.toFixed(2)} → ${f.nach.toFixed(2)}).`
          + (f.soll === 'hoch' ? ' Ein Regler, der nur faellt, laesst den Rest des Sektors ohne Schmuck laufen.' : ''));
    }
  }
}

takt('I  Effekt-Absenkung');

// ---- J  Bucht die Tafel ihre eigene Arbeit getrennt? ------------------
//
// DER ANLASS: die dritte Geraetemessung meldete als laengste Bildluecke
// 115,0 ms bei 121,8 s — bei 122,5 s Gesamtlauf. Der Ausschlag lag im
// letzten Prozent des Laufs, also genau dort, wo aufgeklappt und kopiert
// wird. Ob das Aufklappen ihn erzeugt hat, war NICHT zu entscheiden: hier
// unter SwiftShader dauert jedes Bild 350 ms, darin ist ein Umbau von
// 30 ms unsichtbar. Statt zu raten, bucht die Tafel es getrennt — und
// die naechste Geraetemessung sagt es selbst.
//
// Geprueft wird nach Regel 13 in BEIDE Richtungen: ohne Umbau darf der
// Zaehler nicht steigen, sonst zaehlt er etwas anderes mit.
console.log('\n  J  Ruehrt sich die Tafel waehrend der Messung?');
{
  // BIS v72 MUSSTE SIE SICH RUEHREN: der Streifen stand ueber dem Spiel
  // und wurde alle dreissig Bilder neu geschrieben, das Aufklappen kostete
  // ein eigenes Bild, und beides musste getrennt gebucht werden (v65,
  // Regel 59), damit „laengste" nicht die Messung mass.
  //
  // Seit v73 ist die Tafel waehrend der Messung unsichtbar und wird nicht
  // geschrieben. Damit ist die sauberste Buchung die, die man nicht
  // braucht — und pruefbar ist es schaerfer als vorher: der Inhalt der
  // Tafel darf sich waehrend der Messung nicht um ein Zeichen aendern.
  const inhalt = () => seite.evaluate(() => {
    const w = document.getElementById('messwerte');
    return { text: w ? String(w.innerHTML) : null, an: window.__SKF_MESSAN(),
             eigen: typeof window.__SKF_MESSEIGEN === 'function' ? window.__SKF_MESSEIGEN().umbauten : null };
  });
  await seite.evaluate(() => { if (window.__SKF_MESSAN()) window.__SKF_MESSTAFEL(); window.__SKF_MESSTAFEL(); });
  // ERST REIF WERDEN LASSEN. Unter der Reife schreibt die Tafel ohnehin
  // nichts — dann meldet der Vergleich „unveraendert" ueber eine Tafel,
  // die gar nicht dazu kam, sich zu schreiben. Genau daran ist ein
  // erster Anlauf gescheitert, und die Gegenprobe hat es gefunden.
  if (!await reifWarten(90000)) M.ungemessen('die Tafel wird fuer die Ruheprobe nicht reif.');
  const a = await inhalt();
  // GEWARTET WIRD AUF BILDER, NICHT AUF DIE UHR (Regel 2). Die Tafel
  // schreibt sich hoechstens alle dreissig Bilder — hier unter
  // SwiftShader ist das eine halbe Minute. Ein erster Anlauf wartete
  // sechs Sekunden und meldete „unveraendert" ueber eine Tafel, die
  // sich sehr wohl schrieb.
  {
    const start = await bilder();
    const bis = Date.now() + 90000;
    while (Date.now() < bis) {
      await seite.waitForTimeout(1000);
      const jetzt = await bilder();
      if (jetzt != null && start != null && jetzt - start >= 40) break;
    }
  }
  const b = await inhalt();
  if (a.text === null) M.ungemessen('das Wertefeld der Tafel ist nicht zu lesen.');
  else {
    gemessen++;
    console.log(`     waehrend der Messung  an=${b.an}  Inhalt unveraendert: ${a.text === b.text ? 'ja' : 'NEIN'}  (${a.text.length} Zeichen)`);
    if (!b.an) M.ungemessen('die Messung lief waehrend der Probe gar nicht.');
    else if (a.text !== b.text)
      M.befund(`die Tafel schreibt sich waehrend der Messung neu (${a.text.length} → ${b.text.length} Zeichen). Sie ist dabei unsichtbar — jedes Schreiben ist also Arbeit, die niemand sieht und die in den Bildzeiten landet.`);
    // Und beim Ausschalten MUSS sie sich fuellen, sonst war alles umsonst.
    await seite.evaluate(() => window.__SKF_MESSTAFEL());
    await seite.waitForTimeout(1500);
    const c = await inhalt();
    console.log(`     nach dem Ausschalten  ${c.text.length} Zeichen`);
    if (!(c.text.length > 40))
      M.befund(`nach dem Ausschalten steht kein Ergebnis in der Tafel (${c.text.length} Zeichen).`);
  }
}

takt('J  Tafel ruehrt sich');

// ---- K  Faengt die Vier-Tipp-Ecke die Spielknoepfe ab? ----------------
//
// DER ANLASS, woertlich vom Nutzer: „Der Pause Button ging gerade nicht."
// GEMESSEN an 393 x 852: die Leinwand liegt bei y 115..814, die Ecke ist
// 71 px gross — und darin liegen PAUSE (370, 138) und TON (335, 138).
// Vier Mal auf Pause tippen schaltete die Messung um und setzte sie
// zurueck. Die vier Tipps sind seit v62 nur der Notweg fuer den Fall,
// dass die Spielszene nicht hochkommt; im Gefecht duerfen sie nicht
// zaehlen.
//
// Geprueft wird BEIDES (Regel 13): im Gefecht darf sich nichts aendern,
// im Menue muss sich etwas aendern. Sonst hiesse „nichts passiert"
// womoeglich nur, dass die Tipps ueberhaupt nicht ankommen.
console.log('\n  K  Faengt die Vier-Tipp-Ecke Pause und Ton ab?');
{
  const insGefecht = () => seite.evaluate(async () => {
    const g = window.__game;
    (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
    g.scene.start('Game', { stage: 1 });
    for (let i = 0; i < 40; i++) {
      await new Promise((f) => setTimeout(f, 200));
      const s = (g.scene.scenes || []).find((x) => x.scene.key === 'Game' && x.scene.isActive());
      if (!s) continue;
      if (!s.stageStarted && typeof s.startStage === 'function') s.startStage();
      if (s.player) return true;
    }
    return false;
  });
  if (!await insGefecht()) M.ungemessen('kommt fuer die Eckenprobe nicht ins Gefecht.');
  else {
    await seite.waitForTimeout(1500);
    const ort = await seite.evaluate(() => {
      const g = window.__game;
      const sp = (g.scene.scenes || []).find((s) => s.scene.key === 'Game' && s.scene.isActive());
      const lw = document.querySelector('canvas').getBoundingClientRect();
      const kam = sp.cameras.main, W = kam.width / kam.zoom, H = kam.height / kam.zoom;
      const auf = (p) => ({ x: Math.round(lw.left + p.x / W * lw.width), y: Math.round(lw.top + p.y / H * lw.height) });
      const ecke = Math.max(56, Math.min(lw.width, lw.height) * 0.18);
      const drin = (p) => p.x >= lw.right - ecke && p.y >= lw.top && p.y <= lw.top + ecke;
      const namen = ['pauseBtn', 'mute', 'messBtn'].filter((k) => sp[k] && drin(auf(sp[k])));
      return { pause: sp.pauseBtn ? auf(sp.pauseBtn) : null, ecke: Math.round(ecke), namen };
    });
    if (!ort.pause) M.ungemessen('der Pauseknopf ist nicht zu verorten.');
    else {
      const vierMal = async (p) => {
        for (let i = 0; i < 4; i++) { await seite.mouse.click(p.x, p.y); await seite.waitForTimeout(150); }
        await seite.waitForTimeout(600);
        return seite.evaluate(() => window.__SKF_MESSAN());
      };
      const vor = await seite.evaluate(() => window.__SKF_MESSAN());
      const nachSpiel = await vierMal(ort.pause);
      console.log(`     im Gefecht     Pause bei (${ort.pause.x},${ort.pause.y}), Ecke ${ort.ecke} px, darin: ${ort.namen.join(', ') || '—'}`);
      console.log(`                    Messung ${vor} → ${nachSpiel}`);
      gemessen++;
      if (nachSpiel !== vor)
        M.befund(`vier Tipps auf den PAUSEKNOPF schalten die Messung um (${vor} → ${nachSpiel}). In der oberen rechten Ecke liegen ${ort.namen.join(' und ')} — wer dort pausiert, schaltet nach dem vierten Mal die Messtafel und wirft die laufende Messung weg.`);

      // Und die Gegenrichtung: ausserhalb des Gefechts MUSS die Ecke wirken.
      await seite.evaluate(() => {
        const g = window.__game;
        (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
        g.scene.start('Menu');
      });
      await seite.waitForTimeout(1500);
      const vor2 = await seite.evaluate(() => window.__SKF_MESSAN());
      const nachMenue = await vierMal(ort.pause);
      console.log(`     im Menue       Messung ${vor2} → ${nachMenue}`);
      if (nachMenue === vor2)
        M.befund(`ausserhalb des Gefechts wirken die vier Tipps nicht mehr (${vor2} → ${nachMenue}). Dann ist der Notweg zu, und wenn die Spielszene nicht hochkommt, ist die Tafel gar nicht mehr zu erreichen.`);
    }
  }
}

takt('K  Vier-Tipp-Ecke');

// ---- L  Ueberlebt die Messung eine PAUSE? -----------------------------
//
// DER ANLASS: die v69-Zeile vom Geraet meldete `Q 0.15` bei „2,4 s /
// 144 Bilder" in Sektor 111. Aus ihr war NICHT zu entscheiden, ob der
// Regler zu schnell gefallen ist — denn die 2,4 s waren nicht das Alter
// des Sektors. Bis v69 hing das Zuruecksetzen an `scene.isActive()`, und
// beim PAUSIEREN ist die Spielszene nicht aktiv. Gemessen: 8 Bilder vor
// der Pause, 4 danach. Wer pausiert, wirft seine Messung weg — und die
// Zeile behauptet danach eine Laufzeit, die es nicht gab.
//
// Zurueckgesetzt wird jetzt, wenn der Sektor einen NEUEN LAUF zaehlt.
// Geprueft wird beides (Regel 13): die Pause darf nichts wegwerfen, ein
// neuer Lauf muss es.
console.log('\n  L  Ueberlebt die Messung eine Pause?');
{
  const insGefecht = () => seite.evaluate(async () => {
    const g = window.__game;
    (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
    g.scene.start('Game', { stage: 1 });
    for (let i = 0; i < 40; i++) {
      await new Promise((f) => setTimeout(f, 200));
      const s = (g.scene.scenes || []).find((x) => x.scene.key === 'Game' && x.scene.isActive());
      if (!s) continue;
      if (!s.stageStarted && typeof s.startStage === 'function') s.startStage();
      if (s.player) return true;
    }
    return false;
  });
  if (!await insGefecht()) M.ungemessen('kommt fuer die Pausenprobe nicht ins Gefecht.');
  else {
    await seite.evaluate(() => { if (!window.__SKF_MESSAN()) window.__SKF_MESSTAFEL(); });
    await seite.waitForTimeout(6000);
    const vor = await bilder();
    await seite.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.pauseGame(); });
    await seite.waitForTimeout(2000);
    await seite.evaluate(() => { const g = window.__game; g.scene.stop('Pause'); g.scene.resume('Game'); });
    await seite.waitForTimeout(3000);
    const nach = await bilder();
    console.log(`     Pause          Bilder ${vor} → ${nach}`);
    gemessen++;
    if (vor == null || nach == null) M.ungemessen('die Bilderzahl ist um die Pause herum nicht abzufragen.');
    else if (nach < vor)
      M.befund(`eine Pause setzt die Messung zurueck (${vor} → ${nach} Bilder). Wer pausiert, wirft seine Messung weg — und die kopierte Zeile behauptet danach eine Laufzeit, die es nicht gab. Genau daran war die v69-Messung nicht zu lesen.`);

    // UND EIN NEUER SEKTOR DARF EBENFALLS NICHTS WEGWERFEN (seit v73).
    //
    // Bis v72 setzte jeder neue Sektor zurueck. Der Nutzer will aber
    // einschalten, spielen, ausschalten, kopieren — und dann alles in
    // einer Zeile haben, nicht nur den letzten Sektor.
    const vor2 = await bilder();
    await insGefecht();
    await seite.waitForTimeout(2500);
    const nach2 = await bilder();
    console.log(`     neuer Sektor   Bilder ${vor2} → ${nach2}`);
    if (vor2 != null && nach2 != null && nach2 < vor2)
      M.befund(`ein neuer Sektor wirft die Messung weg (${vor2} → ${nach2} Bilder). Wer drei Sektoren am Stueck spielt, will am Ende alle drei in einer Zeile haben.`);

    // Die Gegenrichtung: wer im MENUE einschaltet, misst sonst die
    // Kulisse mit — dort faengt sie beim ersten Bild im Gefecht einmal
    // von vorn an.
    await seite.evaluate(() => {
      const g = window.__game;
      (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
      g.scene.start('Menu');
    });
    await seite.waitForTimeout(1200);
    await seite.evaluate(() => { if (window.__SKF_MESSAN()) window.__SKF_MESSTAFEL(); window.__SKF_MESSTAFEL(); });
    await seite.waitForTimeout(4000);
    const imMenue = await bilder();
    await insGefecht();
    await seite.waitForTimeout(2500);
    const imGefecht = await bilder();
    console.log(`     Start im Menue Bilder ${imMenue} → ${imGefecht} (nach dem Betreten)`);
    if (imMenue != null && imGefecht != null && imGefecht >= imMenue)
      M.befund(`im Menue eingeschaltet und dann ins Gefecht: die Messung faengt NICHT von vorn an (${imMenue} → ${imGefecht} Bilder). Dann stehen Menuebilder in einer Zeile, die vom Gefecht handeln soll.`);
  }
}

await browser.close();
server.close();
takt('L  Pause');

console.log('\n  Laufzeit je Pruefung   (dieser Rechner, dieser Lauf, SwiftShader ohne Grafikkarte)');
for (const [n, d] of [...takte].sort((a, b) => b[1] - a[1]))
  console.log(`    ${String(d.toFixed(1)).padStart(6)} s   ${Math.round(d / ((Date.now() - taktStart) / 1000) * 100).toString().padStart(2)} %   ${n}`);
console.log(`    ${((Date.now() - taktStart) / 1000).toFixed(1)} s   zusammen`);

console.log('');
if (!gemessen) M.ungemessen('nichts gemessen — es steht keine Zahl zur Verfuegung.');
M.urteil();

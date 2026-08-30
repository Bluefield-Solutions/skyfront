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

  `--ohne-naht` nimmt `__SKF_MESSZEILE` weg und verlangt die Rueckgabe 2.
*/
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Messtafel', 'die Messung laeuft auch eingeklappt, und das Aufklappen wirft sie nicht weg.');

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

// ---- B  anschalten -----------------------------------------------------
await seite.evaluate(() => { window.__SKF_MESSTAFEL && window.__SKF_MESSTAFEL(); });
await seite.waitForTimeout(6000);
{
  const s = await stand();
  gemessen++;
  console.log(`  B  an             an=${s.an}  Klasse=${JSON.stringify(s.klasse)}  Knöpfe ${JSON.stringify(s.knoepfe)}`);
  if (!s.an) M.befund('der Knopf schaltet die Messung nicht an.');
  if (!/klein/.test(String(s.klasse))) M.befund(`angeschaltet steht die Tafel nicht als Streifen da (Klasse ${JSON.stringify(s.klasse)}) — sie soll das Spiel nicht zudecken.`);
  if (!s.knoepfe.some((k) => /Aufklappen/.test(k))) M.befund(`eingeklappt fehlt der Knopf zum Aufklappen (${JSON.stringify(s.knoepfe)}).`);
}

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

// ---- D  aufklappen setzt nicht zurueck --------------------------------
if (!await tippen('auf')) M.ungemessen('der Knopf „Aufklappen" ist nicht da.');
else {
  await seite.waitForTimeout(1500);
  const s = await stand(), nach = await bilder();
  gemessen++;
  console.log(`  D  aufgeklappt    Klasse=${JSON.stringify(s.klasse)}  Bilder ${nach}  Knöpfe ${JSON.stringify(s.knoepfe)}`);
  if (/klein/.test(String(s.klasse))) M.befund('das Aufklappen wirkt nicht — die Tafel bleibt ein Streifen.');
  if (nach != null && nachher != null && nach < nachher) M.befund(`das Aufklappen setzt die Messung zurueck (${nachher} → ${nach} Bilder). Dann wirft das Ablesen weg, was man ablesen wollte.`);
  for (const w of ['Kopieren', 'Einklappen', 'Messung aus'])
    if (!s.knoepfe.some((k) => k.includes(w))) M.befund(`aufgeklappt fehlt der Knopf „${w}" (${JSON.stringify(s.knoepfe)}).`);
}

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

// ---- G  der Schalter ueberlebt ein Neuladen ---------------------------
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

await browser.close();
server.close();
console.log('');
if (!gemessen) M.ungemessen('nichts gemessen — es steht keine Zahl zur Verfuegung.');
M.urteil();

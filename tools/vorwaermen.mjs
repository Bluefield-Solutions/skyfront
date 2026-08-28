#!/usr/bin/env node
/*
  Vorwaermen — wird waehrend des Gefechts noch eine Textur gebacken?

    node tools/vorwaermen.mjs

  DER ANLASS: „Es wirkt etwas abgehakt, insbesondere wenn die Gegner
  kommen." Das war kein Gefuehl, sondern eine Stelle im Code.

  gegnerBacken() legte bis v44 beim ERSTEN Spawn jeder Gegnerart ein neues
  Canvas an, zeichnete acht versetzte Kopien fuer den dunklen Saum darauf,
  las es zurueck und schob die fertige Textur zur Grafikkarte. Aufgerufen
  wurde es aus spawn() — also in dem Augenblick, in dem die Welle
  einfliegt. Ein Sektor hat bis zu zehn Arten; das sind bis zu zehn
  Bildschlaege, jeder an der unguenstigsten Stelle.

  WAS GEMESSEN WIRD: `window.__SKF_BACKZAEHLER` zaehlt jeden Backvorgang.
  Gelesen wird er ZWEIMAL — einmal direkt nach dem Sektorstart (da soll er
  stehen: das Vorwaermen), und einmal, nachdem jede Gegnerart des Sektors
  gespawnt wurde (da darf er sich NICHT mehr bewegen).

  WAS ES NICHT MISST: Bilddauer. Das kann diese Umgebung nicht — hier
  rechnet SwiftShader ohne Grafikkarte, eine Millisekundenzahl von hier
  traegt nicht aufs Telefon. Gezaehlt wird die URSACHE, nicht die Wirkung.
*/
import { existsSync } from 'node:fs';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Vorwaermen', 'waehrend des Gefechts wird keine Gegnertextur mehr gebacken.');

if (!existsSync('dist/Skyfront.html')) M.abbruch('dist/Skyfront.html fehlt — erst bauen.');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.abbruch('Playwright nicht gefunden.'); }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
// Die Einweisung ueberspringen — so, wie sie ein Spieler beim zweiten
// Start ueberspringt. Sie liegt zwischen Menue und Sektorbeginn, und sie
// per Tippen wegzuraeumen hat drei Anlaeufe gekostet: der Tipp kam
// entweder zu frueh (noch im Menue) oder erreichte ihren Handler nicht.
// Ein Schalter im Speicher ist der Weg, den das Spiel selbst nimmt.
await seite.addInitScript(() => { try { localStorage.setItem('seen_tut', '1'); } catch (e) {} });
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
await seite.waitForFunction(() => window.__game && window.__SKF_GEGNER, null, { timeout: 90000 });
if (OHNE_NAHT) await seite.evaluate(() => { delete window.__SKF_BACKZAEHLER; });
await seite.waitForTimeout(1200);

const r = await seite.evaluate(() => {
  const c = document.querySelector('canvas').getBoundingClientRect();
  return { x: c.x, y: c.y, w: c.width, h: c.height };
});
await seite.touchscreen.tap(r.x + 0.5 * r.w, r.y + 0.711 * r.h);
let imSpiel = false;
for (let i = 0; i < 60; i++) {
  imSpiel = await seite.evaluate(() => (window.__game.scene.scenes || []).some((s) => s.scene.key === 'Game' && s.scene.isActive()));
  if (imSpiel) break;
  await seite.waitForTimeout(250);
}
if (!imSpiel) { await browser.close(); M.abbruch('kommt nicht ins Gefecht.'); }

// Den Sektor beginnen lassen. Beim allerersten Start liegt die Einweisung
// zwischen Menue und Sektor, und startStage() laeuft erst nach ihr.
//
// Sie per Tippen wegzuraeumen hat drei Anlaeufe gekostet und nie
// funktioniert: zu frueh getippt landet der Finger noch im Menue, spaeter
// erreicht er ihren Handler nicht. Ein Schalter im Speicher hilft auch
// nicht — unter file:// ist localStorage gesperrt, das Spiel faengt den
// Fehler ab, und die Einweisung erscheint jedes Mal.
//
// Also wird startStage() aufgerufen, wenn es von selbst nicht anlaeuft.
// Das ist derselbe Aufruf, den die Einweisung am Ende macht — und der
// Messgegenstand (backt eine Art beim Spawn nach?) haengt nicht daran,
// wer den Sektor gestartet hat.
let begonnen = false;
for (let i = 0; i < 12; i++) {
  begonnen = await seite.evaluate(() => {
    const g = window.__game.scene.getScene('Game');
    return !!(g && g.levelEndAt > 0);
  });
  if (begonnen) break;
  await seite.waitForTimeout(500);
}
const selbstGestartet = !begonnen;
if (!begonnen) {
  const ok = await seite.evaluate(() => {
    const g = window.__game.scene.getScene('Game');
    try { g.startStage(); return g.levelEndAt > 0; } catch (e) { return 'FEHLER: ' + e.message; }
  });
  if (ok !== true) { await browser.close(); M.abbruch(`der Sektor laesst sich nicht starten (${ok}).`); }
}
await seite.waitForTimeout(600);

// Sektor 1 hat zwei Gegnerarten. Spaeter sind es bis zu zehn, und dort
// liegt der Schaden: gemessen wird deshalb BEIDES.
const SEKTOREN = [1, 40, 100];
const ergebnisse = [];
for (const sek of SEKTOREN) {
  const e = await seite.evaluate((sek) => {
    const spiel = window.__game.scene.getScene('Game');
    if (typeof window.__SKF_BACKZAEHLER !== 'number') return { fehler: 'Naht fehlt (__SKF_BACKZAEHLER)' };
    spiel.stage = sek;
    try { spiel.startStage(); } catch (e) { return { fehler: 'Sektor ' + sek + ': ' + e.message }; }
    const nachStart = window.__SKF_BACKZAEHLER;
    const vorgewaermt = spiel.vorgewaermt;

  // Jede Art aus dem WELLENPLAN dieses Sektors einmal setzen — dasselbe,
  // was das Gefecht gleich tun wird, nur sofort.
    const arten = spiel.vorgewaermteArten || [];
    for (const k of arten) { try { spiel.spawnAt(k, 270, 0); } catch (e) {} }
    const nachSpawn = window.__SKF_BACKZAEHLER;

    return { sektor: sek, nachStart, vorgewaermt, nachSpawn, arten: arten.length };
  }, sek);
  if (e.fehler) { await browser.close(); M.abbruch(e.fehler); }
  ergebnisse.push(e);
}

// Und zur Kontrolle: ZAEHLT der Zaehler ueberhaupt? Wenn nach allem
// Vorwaermen noch Arten uebrig sind, die beim Spawnen backen, ist die
// Null oben eine gemessene Null und keine tote Leitung (eiserne Regel 5).
const kontrolle = await seite.evaluate(() => {
  const spiel = window.__game.scene.getScene('Game');
  const vor = window.__SKF_BACKZAEHLER;
  for (const k of Object.keys(window.__SKF_GEGNER)) { try { spiel.spawnAt(k, 270, 0); } catch (e) {} }
  return window.__SKF_BACKZAEHLER - vor;
});

await browser.close();

console.log('Vorwaermen — Backvorgaenge je Sektor\n');
if (selbstGestartet) console.log('  (die Sektoren wurden vom Werkzeug gestartet — die Einweisung stand davor)\n');
console.log('  Sektor   Arten im Plan   vorgebacken   backt beim Spawnen nach');
for (const e of ergebnisse)
  console.log(`  ${String(e.sektor).padStart(6)}   ${String(e.arten).padStart(13)}   ${String(e.vorgewaermt).padStart(11)}   ${String(e.nachSpawn - e.nachStart).padStart(23)}`);
console.log(`\n  Kontrolle: ${kontrolle} weitere Art(en) backen beim Spawnen — der Zaehler zaehlt.`);

for (const e of ergebnisse) {
  if (!(e.vorgewaermt > 0))
    M.befund(`Sektor ${e.sektor}: beim Sektorstart wurde nichts vorgebacken — dann backt jede Welle selbst, mitten im Einflug.`);
  if (e.nachSpawn > e.nachStart)
    M.befund(`Sektor ${e.sektor}: ${e.nachSpawn - e.nachStart} Gegnertextur(en) werden erst beim Spawnen gebacken, obwohl sie `
      + `im Wellenplan stehen. Jede davon ist ein Bildschlag in dem Augenblick, in dem die Welle einfliegt.`);
}
if (kontrolle === 0)
  M.ungemessen('keine einzige Art backte nach — der Zaehler koennte tot sein, dann sagen die Nullen oben nichts.');

M.urteil();

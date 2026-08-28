#!/usr/bin/env node
/*
  Musik — laeuft in jedem Modus ein Stueck, und wie oft wiederholt es sich?

    node tools/musik.mjs

  DER ANLASS: „Musik soll einfach passend sein fuer so ein Spiel. Nicht
  einfach so kleines Rumgedudel. Anstaendige Musik."

  Bis v48 lief ein Achttakter von 8,96 s aus Oszillatoren — in einem
  Sektor von 139 s sechzehn Mal. Seit v49 laufen drei fertig produzierte
  Stuecke; der erzeugte Klang ist der Rueckfall geblieben.

  GEMESSEN WIRD AM GEBAUTEN SPIEL, im Browser:

    Vorrat       hat jeder Modus (menu, normal, boss) ein Stueck?
    Laenge       wie lang ist es wirklich — abgelesen am Element, nicht
                 an einer Zahl im Werkzeug
    Wiederholung Laenge gegen die gemessene Sektorspanne (78 bis 139 s)
    Wiedergabe   laeuft es nach dem Start tatsaechlich, oder steht es?
    Rueckfall    laeuft der Sequenzer NICHT, solange ein Stueck spielt?

  Der letzte Punkt ist der, der sonst niemandem auffiele: laufen beide,
  hoert man beides uebereinander.
*/
import { existsSync } from 'node:fs';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Musik', 'jeder Modus hat ein Stueck, es laeuft, und es wiederholt sich selten genug.');
// Wieviele Wiederholungen ertraegt ein Sektor? Gesetzt, nicht gemessen —
// und hier hingeschrieben, damit man widersprechen kann: ab der achten
// Wiederholung desselben Stuecks hoert man die Naht, und ab da hoert man
// nur noch sie. Die Sektorspanne kommt aus npm run zeitachse (v46).
const OBEN = 8, KURZ = 78, LANG = 139;

if (!existsSync('dist/Skyfront.html')) M.abbruch('dist/Skyfront.html fehlt — erst bauen.');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.abbruch('Playwright nicht gefunden.'); }

const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
await seite.waitForFunction(() => window.__game, null, { timeout: 90000 });
if (OHNE_NAHT) await seite.evaluate(() => { delete window.__SKFM; });
await seite.waitForTimeout(1500);

const vorrat = await seite.evaluate(() => {
  if (typeof window.__SKFM === 'undefined') return null;
  return Object.keys(window.__SKFM).map((k) => ({ modus: k, kb: Math.round(window.__SKFM[k].length / 1024) }));
});

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
await seite.waitForTimeout(3500);

// Die Bossspur wird erst beim Bosskampf angelegt. Ohne diesen Anstoss
// stuende sie als "nicht geladen" in der Tafel und waere ungeprueft — ein
// Stueck, das keiner misst, ist so gut wie keins.
await seite.evaluate(() => {
  const a = window.__game.scene.getScene('Game').audio;
  const s = a.musikSpur && a.musikSpur('boss');
  if (s) try { s.el.load(); } catch (e) {}
});
await seite.waitForTimeout(1800);

// Laeuft es? Zweimal ablesen, mit Abstand — eine Spur, die steht, hat
// dieselbe Zeit. Eine Zahl allein sagt nur, dass sie existiert.
const vorher = await seite.evaluate(() => {
  const a = window.__game.scene.getScene('Game').audio;
  const s = a.spuren || {};
  return { modus: a.mode, sequenzer: a.timer != null,
    spuren: Object.keys(s).map((k) => ({ k, zeit: s[k].el.currentTime, dauer: s[k].el.duration, pegel: s[k].g.gain.value })) };
});
await seite.waitForTimeout(2500);
const nachher = await seite.evaluate(() => {
  const a = window.__game.scene.getScene('Game').audio, s = a.spuren || {};
  return Object.fromEntries(Object.keys(s).map((k) => [k, s[k].el.currentTime]));
});
await browser.close();

console.log('Musik — am gebauten Spiel\n');
if (!vorrat) {
  console.log('  __SKFM fehlt — das Spiel laeuft auf dem erzeugten Klang.');
  M.befund('kein Musikvorrat im Bau (__SKFM fehlt). Dann laeuft der Sequenzer von v48: ein Achttakter von 9 s, '
    + `im laengsten Sektor ${(LANG / 8.96).toFixed(0)} Mal.`);
  M.urteil();
}

console.log('  Modus     in der Datei   Laenge    Wiederholungen je Sektor');
for (const v of vorrat) {
  const sp = vorher.spuren.find((x) => x.k === v.modus);
  const d = sp && sp.dauer > 0 ? sp.dauer : 0;
  console.log(`  ${v.modus.padEnd(9)} ${String(v.kb).padStart(9)} KB   ${d ? d.toFixed(1) + ' s' : '   —  '}   `
    + (d ? `${(KURZ / d).toFixed(1)} bis ${(LANG / d).toFixed(1)}` : 'nicht geladen'));
  if (d && LANG / d > OBEN)
    M.befund(`"${v.modus}" ist nur ${d.toFixed(1)} s lang und wiederholt sich im laengsten Sektor ${(LANG / d).toFixed(0)} Mal `
      + `(erlaubt ${OBEN}).`);
}

const laufend = vorher.spuren.filter((s) => s.pegel > 0.05);
console.log(`\n  Modus jetzt: ${vorher.modus}   ·   Sequenzer laeuft: ${vorher.sequenzer ? 'JA' : 'nein'}`);
for (const s of laufend)
  console.log(`  "${s.k}" spielt: ${s.zeit.toFixed(2)} s → ${(nachher[s.k] || 0).toFixed(2)} s nach zweieinhalb Sekunden`);

if (!laufend.length)
  M.befund('keine einzige Spur steht auf hoerbarem Pegel — es gibt Musik im Vorrat, aber sie spielt nicht.');
for (const s of laufend)
  if (!((nachher[s.k] || 0) > s.zeit + 0.5))
    M.befund(`"${s.k}" steht: ${s.zeit.toFixed(2)} s vorher, ${(nachher[s.k] || 0).toFixed(2)} s nachher. Ein Stueck, das nicht laeuft, ist keins.`);
if (vorher.sequenzer && laufend.length)
  M.befund('der erzeugte Klang laeuft ZUSAETZLICH zum Stueck — dann hoert man beides uebereinander. '
    + 'Der Sequenzer ist der Rueckfall, nicht die zweite Stimme.');
if (vorrat.length < 3)
  M.ungemessen(`nur ${vorrat.length} von drei Modi haben ein Stueck.`);

M.urteil();

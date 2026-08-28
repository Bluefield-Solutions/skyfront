#!/usr/bin/env node
/*
  Geschossdichte — wie viele Gegnergeschosse sind gleichzeitig unterwegs?

    node tools/geschossdichte.mjs [--tempo=260,300,340,380]

  DER ANLASS, gespielt und berichtet: „Teilweise sind zu viele Geschosse
  unterwegs, sodass man keine Moeglichkeit hat, denen zu entkommen.
  Braeuchten ein paar weniger Geschosse, die muessten aber auch ein
  bisschen schneller sein."

  DIE RECHNUNG dahinter ist zwei Divisionen lang:

    Ein Geschoss ist HOEHE / TEMPO Sekunden im Bild.
    Ein Gegner erzeugt SCHUSSZAHL / FEUERTAKT Geschosse je Sekunde.
    Gleichzeitig im Bild sind also beides miteinander malgenommen.

  Daraus folgt der Hebel, den der Wunsch beschreibt: ein SCHNELLERES
  Geschoss ist kuerzer im Bild, also sind weniger gleichzeitig da — ohne
  dass ein Gegner seltener schiesst. Von 260 auf 340 sind es ein Viertel
  weniger, bei gleicher Feuerrate.

  GEMESSEN WIRD JE GEGNERART, nicht je Sektor.

  Der erste Entwurf rechnete den ganzen Sektor: wer laut Wellenplan wann
  kommt, mal seiner Durchflugzeit. Er kam auf 970 gleichzeitige Geschosse
  in Sektor 100 — offensichtlicher Unsinn. Der Fehler steckt in einer
  Annahme, die niemand geprueft hatte: dass jeder Gegner die volle
  Durchflugzeit lebt und ununterbrochen feuert. In Wahrheit ist er nach
  Sekunden abgeschossen, und wie lange er lebt, kann diese Rechnung nicht
  wissen. Eine Zahl, die offensichtlich nicht stimmt, wird nicht mit einer
  angehobenen Grenze gerettet — sie wird gestrichen.

  Was BLEIBT, ist modellfrei: was EIN Gegner, solange er lebt, an
  Geschossen im Bild haelt. Da steckt keine Annahme drin ausser der, dass
  er feuert — und dafuer ist er da.

  WOHER DIE ZAHLEN KOMMEN — jede einzelne aus dem laufenden Spiel:

    Schusszahl   Das Spiel feuert selbst. `fireEnemy()` wird je Gegnerart
                 aufgerufen, nur `spawnEB` faengt mit und zaehlt. Die
                 verzoegerten Schuesse (burst3, twin) werden dabei sofort
                 ausgefuehrt, sonst fehlten sie in der Zaehlung.
    Feuertakt    cfg.fireEvery aus der Gegnertabelle.
    Tempo        _t.bulletSpeed, der Wert aus src/balance.js.
  WAS DAS NICHT IST: eine Vorhersage, wieviele Geschosse auf dem Schirm
  stehen — dafuer muesste man wissen, wieviele Gegner gleichzeitig leben.
  Es ist die Dichte, die EINER erzeugt: ein Vergleichsmass, mit dem sich
  Gegnerarten nebeneinanderlegen und Tempi durchprobieren lassen.
*/
import { existsSync } from 'node:fs';
import { messstelle } from './messstelle.mjs';

const M = messstelle('Geschossdichte', 'kein einzelner Gegner haelt mehr Geschosse im Bild als das Band erlaubt.');
const arg = process.argv.find((a) => a.startsWith('--tempo='));
const TEMPI = arg ? arg.slice(8).split(',').map(Number) : null;

// Das Band. Gesetzt, nicht gemessen — und hier hingeschrieben, damit man
// ihm widersprechen kann: bei zwoelf Geschossen aus EINER Quelle bleiben
// auf 540 Punkten Breite Luecken, durch die ein Flugzeug von 60 Punkten
// passt. Der Elite lag bei 45.
const OBEN = 12;

if (!existsSync('dist/Skyfront.html')) M.abbruch('dist/Skyfront.html fehlt — erst bauen.');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.abbruch('Playwright nicht gefunden.'); }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
await seite.waitForFunction(() => window.__game && window.__SKF_GEGNER, null, { timeout: 90000 });
await seite.waitForTimeout(1500);
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
await seite.waitForTimeout(8000);

const d = await seite.evaluate((tempi) => {
  const spiel = window.__game.scene.getScene('Game');
  const Ke = window.__SKF_GEGNER;
  if (!Ke) return { fehler: 'Naht fehlt (__SKF_GEGNER)' };

  // Wie viele Geschosse gibt eine Art je Feuerstoss ab? Das Spiel feuert
  // selbst; nur spawnEB faengt mit und zaehlt (eiserne Regel 4).
  const echtEB = spiel.spawnEB, echtDelay = spiel.time.delayedCall.bind(spiel.time);
  const arten = [];
  for (const art of Object.keys(Ke)) {
    const cfg = Ke[art];
    if (!cfg.fireEvery) continue;
    let n = 0;
    spiel.spawnEB = () => { n++; };
    // Verzoegerte Schuesse sofort ausfuehren — sonst zaehlt burst3 als
    // einer und twin als keiner, und gerade die machen die Dichte.
    spiel.time.delayedCall = (ms, f) => { try { f(); } catch (e) {} return { remove() {} }; };
    try { spiel.fireEnemy({ x: 270, y: 200, rotation: 0, active: true, cfg }); } catch (e) { n = -1; }
    spiel.spawnEB = echtEB; spiel.time.delayedCall = echtDelay;
    arten.push({ art, schuss: n, takt: cfg.fireEvery, muster: cfg.pattern || '—' });
  }
  const HOEHE = 960;
  const tempoJetzt = (window.__SKF_GEGNERWERTE || {}).bulletSpeed || 0;
  return { arten, HOEHE, tempoJetzt, tempi: tempi || [tempoJetzt] };
}, TEMPI);
await browser.close();
if (d.fehler) M.abbruch(d.fehler);
if (!(d.tempoJetzt > 0)) M.ungemessen('das Geschosstempo liess sich nicht auslesen.');

// Gleichzeitig im Bild = Schuesse je Sekunde mal Flugzeit.
const dichte = (a, tempo) => a.schuss / (a.takt / 1000) * (d.HOEHE / tempo);
const sortiert = [...d.arten].sort((x, y) => dichte(y, d.tempoJetzt) - dichte(x, d.tempoJetzt));

console.log(`Geschossdichte — was EIN Gegner gleichzeitig im Bild haelt (Schirm ${d.HOEHE} hoch)\n`);
console.log(`  Tempo jetzt: ${d.tempoJetzt}   ·   Flugzeit eines Geschosses: ${(d.HOEHE / d.tempoJetzt).toFixed(2)} s\n`);
console.log('  Gegner         Muster      Schuss   Takt      ' + d.tempi.map((t) => String(t).padStart(6)).join(''));
for (const a of sortiert)
  console.log(`  ${a.art.padEnd(14)} ${String(a.muster).padEnd(11)} ${String(a.schuss).padStart(6)}   ${String(a.takt).padStart(5)} ms  `
    + d.tempi.map((t) => dichte(a, t).toFixed(1).padStart(6)).join(''));
console.log(`\n  Band: hoechstens ${OBEN} aus einer Quelle.`);

const zuViel = sortiert.filter((a) => dichte(a, d.tempoJetzt) > OBEN);
if (zuViel.length)
  M.befund(`${zuViel.length} Gegnerart(en) halten allein mehr als ${OBEN} Geschosse gleichzeitig im Bild `
    + `(${zuViel.map((a) => `${a.art} ${dichte(a, d.tempoJetzt).toFixed(0)}`).join(', ')}). `
    + `Wo zwei davon zugleich stehen, ist Ausweichen Glueckssache.`);
if (d.arten.some((a) => a.schuss < 0))
  M.ungemessen('mindestens eine Gegnerart liess sich nicht zum Feuern bringen.');

M.urteil();

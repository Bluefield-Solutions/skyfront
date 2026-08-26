#!/usr/bin/env node
/*
  Steuerung — zieht die Maschine bei 60 und bei 120 Hz gleich schnell nach?

    node tools/steuerung.mjs

  DER ANLASS: „das eigene Flugzeug noch nicht so ganz smooth". Nachgesehen
  stand in der Quelle speedLerp = 1 — die Maschine SPRINGT jedes Bild auf
  den Finger, ohne jede Glaettung, und der Fingerweg wirkt mit Faktor 1,95.
  Jedes Zittern kam doppelt und sofort an.

  Eine Nachfuehrung allein reicht aber nicht: `x += (ziel - x) * lerp` je
  Bild haengt an der BILDRATE. Auf einem 120-Hz-Telefon laeuft dieselbe Zahl
  doppelt so schnell nach wie auf einem 60-Hz-Telefon. Das faellt niemandem
  auf, der nur ein Geraet hat — und es ist der Grund, warum sich dasselbe
  Spiel auf zwei Telefonen verschieden anfuehlt.

  WIE GEMESSEN WIRD: die update()-Methode des SPIELERS wird aufgerufen, mit
  verschiedenen Zeitschritten. Kein Nachbau (eiserne Regel 4). Gemessen wird,
  WIE WEIT die Maschine nach genau 100 Millisekunden gekommen ist — nicht,
  nach wie vielen Bildern sie ankommt.

  Der erste Entwurf fragte umgekehrt: nach wie vielen Millisekunden sind
  95 % geschafft? Das misst die Bildrate mit. Bei 30 Hz ist ein Schritt
  33 ms lang, die Schwelle wird also grob ueberschritten — 100 ms gegen
  75 ms bei 120 Hz, 33 % Unterschied, obwohl die Nachfuehrung korrekt war.
  Eine Messung, deren Aufloesung die gemessene Groesse ist, taugt nicht.

  VERLANGT WIRD:
    1. Nach 100 ms ist die Maschine bei 30, 60 und 120 Hz gleich weit
       (hoechstens ABWEICHUNG Prozentpunkte auseinander).
    2. Nach EINEM Bild bei 60 Hz ist sie noch NICHT da — eine Maschine, die
       springt, ist nicht geglaettet, und genau das war der Befund.
    3. Nach 100 ms ist sie weitgehend da — sonst ist es nicht weich,
       sondern schwammig.

  WAS DAS NICHT SAGT: ob es sich gut anfuehlt. Das sagt nur das Geraet.
*/
import { existsSync } from 'node:fs';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Steuerung', 'die Nachfuehrung ist geglaettet und haengt nicht an der Bildrate.');

const RATEN = [30, 60, 120];
const FENSTER = 100;        // ms, in denen gemessen wird
const ABWEICHUNG = 3;       // Prozentpunkte zwischen den Bildraten
const SPRUNG_MAX = 90;      // % nach EINEM Bild bei 60 Hz — darueber ist es ein Sprung
const WEICH_MIN = 60;       // % nach FENSTER — darunter schwammig

if (!existsSync('dist/Skyfront.html')) M.abbruch('dist/Skyfront.html fehlt — erst bauen.');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.abbruch('Playwright nicht gefunden.'); }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
await seite.waitForFunction(() => window.__game, null, { timeout: 90000 });
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
if (!imSpiel) { await browser.close(); M.abbruch('kommt nicht ins Gefecht — ohne Spieler keine Steuerung.'); }
await seite.waitForTimeout(1000);

const daten = await seite.evaluate(({ raten, fenster, ohneNaht }) => {
  const g = window.__game.scene.getScene('Game');
  const s = g.player;
  if (ohneNaht || !s || typeof s.update !== 'function') return { fehler: 'der Spieler ist nicht zu erreichen' };
  const merkX = s.x, merkY = s.y, merkZielX = s.targetX, merkZielY = s.targetY, merkRolle = s.rolle;
  const aus = [];
  const lauf = (hz, ms) => {
    const dt = 1000 / hz, start = 100;
    s.x = start; s.y = 700; s.targetY = 700; s.rolle = 0;
    s.setTarget(400, 700);
    const weg = s.targetX - start;                 // nach Clamp
    let t = 0, bilder = 0;
    while (t + 1e-9 < ms) { s.update(1000 + t, dt); t += dt; bilder++; }
    return { bilder, anteil: weg === 0 ? 1 : (s.x - start) / weg };
  };
  for (const hz of raten) {
    const e = lauf(hz, fenster);
    aus.push({ hz, bilder: e.bilder, anteil: e.anteil });
  }
  // Und die Frage, ob ueberhaupt geglaettet wird: GENAU ein Bild bei 60 Hz.
  // Fenster 1 ms, damit die Schleife unabhaengig vom Schritt genau einmal
  // laeuft — mit "ein Bildschritt plus Epsilon" waren es zwei.
  aus.einBild = lauf(60, 1).anteil;
  s.x = merkX; s.y = merkY; s.targetX = merkZielX; s.targetY = merkZielY; s.rolle = merkRolle;
  return { aus, einBild: aus.einBild };
}, { raten: RATEN, fenster: FENSTER, ohneNaht: OHNE_NAHT });
await browser.close();

if (daten.fehler) M.abbruch(daten.fehler);
const z = daten.aus;
if (z.length !== RATEN.length) M.ungemessen(`nur ${z.length} von ${RATEN.length} Bildraten gemessen.`);

console.log(`Steuerung — Weg nach ${FENSTER} ms bei ${RATEN.join(', ')} Hz\n`);
console.log('  Bildrate   Bilder   nach ' + FENSTER + ' ms');
for (const e of z)
  console.log(`  ${String(e.hz).padStart(6)} Hz   ${String(e.bilder).padStart(6)}   ${(e.anteil * 100).toFixed(1).padStart(8)} %`);
console.log(`\n  nach EINEM Bild bei 60 Hz: ${(daten.einBild * 100).toFixed(1)} %`);

const anteile = z.map((e) => e.anteil * 100);
const min = Math.min(...anteile), max = Math.max(...anteile);
console.log(`  Unterschied zwischen den Bildraten: ${(max - min).toFixed(1)} Prozentpunkte (erlaubt ${ABWEICHUNG})`);

if (max - min > ABWEICHUNG)
  M.befund(`die Nachfuehrung haengt an der Bildrate: nach ${FENSTER} ms ${min.toFixed(1)} % bei `
    + `${z.find((e) => e.anteil * 100 === min).hz} Hz gegen ${max.toFixed(1)} % bei ${z.find((e) => e.anteil * 100 === max).hz} Hz. `
    + `Dasselbe Spiel fuehlt sich auf zwei Telefonen verschieden an.`);

if (daten.einBild * 100 > SPRUNG_MAX)
  M.befund(`nach einem einzigen Bild bei 60 Hz ist die Maschine schon bei ${(daten.einBild * 100).toFixed(1)} % — das ist ein Sprung, keine Nachfuehrung. Jedes Zittern des Fingers kommt ungefiltert an.`);
const sechzig = z.find((e) => e.hz === 60);
if (sechzig && sechzig.anteil * 100 < WEICH_MIN)
  M.befund(`nach ${FENSTER} ms ist die Maschine erst bei ${(sechzig.anteil * 100).toFixed(1)} % — unter ${WEICH_MIN} % fuehlt sich das schwammig an, nicht weich.`);

M.urteil();

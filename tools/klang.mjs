#!/usr/bin/env node
/*
  Klang — wie viele Toene laufen gleichzeitig, und klingt Gross anders
  als Klein?

    node tools/klang.mjs

  DER ANLASS, gespielt und berichtet: „Der Sound gefaellt mir noch nicht:
  sowohl die Musik als auch der Sound, wenn man einen Gegner trifft oder
  getoetet hat."

  GEMESSEN WIRD AN DEN KLANGBAUSTEINEN des Spiels: tone(), noise(),
  click() und sub() werden abgefangen, mit ihren Argumenten. Jeder Klang
  meldet damit, aus wievielen Bausteinen er besteht, wie lang sie sind und
  auf welcher Tonhoehe.

  Der erste Entwurf fing eine Ebene tiefer ab, bei createOscillator und
  createBufferSource. Er meldete NULL Quellen fuer einen Klang, den man
  hoert, und 440 Hz fuer jeden Ton — 440 ist der Standardwert eines
  frischen Oszillators, die wirkliche Tonhoehe wird ueber eine Rampe
  gesetzt und stand dort noch gar nicht drin. Eine Messstelle, die den
  Standardwert eines Feldes liest, misst das Feld und nicht den Klang.

  ZWEI FRAGEN:

    Sperre       Zwanzig Treffer in Folge — wieviele Toene kommen durch?
                 Bis v46 alle zwanzig, auf derselben Tonhoehe. Was man
                 dann hoert, ist ein Dauerton und kein Treffer.

    Abstufung    Klingt der Abschuss eines Spaehers anders als der eines
                 Traegers? Bis v46 nicht: dieselbe Funktion, dieselbe
                 Fahne von 0,3 Sekunden, derselbe Sub-Bass.

  WAS DAS NICHT SAGT: ob es GUT klingt. Das kann nur ein Ohr, und dieses
  Werkzeug hat keins.
*/
import { existsSync } from 'node:fs';
import { messstelle } from './messstelle.mjs';

const M = messstelle('Klang', 'Treffer stapeln sich nicht, und ein Abschuss klingt nach seiner Groesse.');
const SPERRE_MAX = 8;   // von zwanzig Treffern in Folge duerfen so viele durch
const UNTERSCHIED = 1.6; // XL muss mindestens so viel laenger klingen als S

if (!existsSync('dist/Skyfront.html')) M.abbruch('dist/Skyfront.html fehlt — erst bauen.');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.abbruch('Playwright nicht gefunden.'); }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
await seite.waitForFunction(() => window.__game, null, { timeout: 90000 });
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
await seite.waitForTimeout(3000);

const d = await seite.evaluate(() => {
  const spiel = window.__game.scene.getScene('Game');
  const a = spiel.audio;
  if (!a) return { fehler: 'keine Tonausgabe an der Szene' };
  if (!a.ensure || !a.ensure()) return { fehler: 'der Tonkontext laesst sich nicht oeffnen' };
  const ctx = a.ctx;

  // Mitschreiben, welche Bausteine mit welchen Argumenten laufen.
  let log = [];
  const echt = {};
  for (const name of ['tone', 'noise', 'click', 'sub']) {
    echt[name] = a[name].bind(a);
    a[name] = (...arg) => {
      // tone(hz, dauer, form, laut, …) · noise(dauer, laut, …) ·
      // click(laut) · sub(hz, dauer, laut)
      const dauer = name === 'tone' ? arg[1] : name === 'noise' ? arg[0] : name === 'sub' ? arg[1] : 0.01;
      log.push({ name, hz: name === 'tone' || name === 'sub' ? arg[0] : 0, dauer: dauer || 0 });
      return echt[name](...arg);
    };
  }
  const miss = (f) => { log = []; try { f(); } catch (e) {} return log.slice(); };

  // 1. Zwanzig Treffer so schnell, wie das Autofeuer sie ausloest.
  const treffer = miss(() => { for (let i = 0; i < 20; i++) a.hit(); });
  const hz = [...new Set(treffer.filter((x) => x.name === 'tone').map((x) => Math.round(x.hz)))];

  // 2. Ein Abschuss je Groessenklasse.
  const klasse = (k) => {
    const l = miss(() => a.explosion(k));
    return { klasse: k || 'S/M', quellen: l.length, dauer: l.reduce((m, x) => Math.max(m, x.dauer), 0) };
  };
  // Erst messen, DANN die Wrapper zurueckgeben. Beim ersten Anlauf
  // standen die klasse()-Aufrufe im return-Ausdruck und liefen damit nach
  // dem Zuruecksetzen — drei Klaenge meldeten null Bausteine, obwohl sie
  // welche haben. Der Befund las sich wie ein stummer Abschuss.
  const klassen = [klasse(undefined), klasse('L'), klasse('XL')];
  const gross = miss(() => a.bigExplosion());
  for (const name of ['tone', 'noise', 'click', 'sub']) a[name] = echt[name];

  return {
    treffer: treffer.length, trefferToene: treffer.filter((x) => x.name === 'tone').length, hz,
    klassen,
    gross: { klasse: 'Boss', quellen: gross.length, dauer: gross.reduce((m, x) => Math.max(m, x.dauer), 0) },
  };
});
await browser.close();
if (d.fehler) M.abbruch(d.fehler);

console.log('Klang — an den Klangbausteinen gemessen\n');
console.log(`  Zwanzig Treffer in Folge → ${d.trefferToene} Ton/Toene (Grenze ${SPERRE_MAX})`);
console.log(`  verschiedene Tonhoehen dabei: ${d.hz.length}   ${d.hz.slice(0, 8).join(', ')}${d.hz.length > 8 ? ' …' : ''}`);
console.log('\n  Abschuss    Quellen   laengste Quelle');
for (const k of [...d.klassen, d.gross])
  console.log(`  ${String(k.klasse).padEnd(11)} ${String(k.quellen).padStart(7)}   ${k.dauer.toFixed(2)} s`);

const klein = d.klassen[0], xl = d.klassen[2];
if (d.trefferToene > SPERRE_MAX)
  M.befund(`von zwanzig Treffern in Folge kommen ${d.trefferToene} Toene durch (erlaubt ${SPERRE_MAX}). `
    + `Bei Autofeuer alle 100 ms legt sich daraus ein Dauerton ueber alles andere.`);
if (d.hz.length < 2 && d.trefferToene > 1)
  M.befund(`alle Treffertoene liegen auf derselben Tonhoehe (${d.hz[0]} Hz). Zwanzig davon sind ein Signalton, kein Gefecht.`);
if (!(klein.dauer > 0) || !(xl.dauer > 0))
  M.ungemessen('mindestens ein Abschussklang hat gar keine Quelle gestartet.');
else if (xl.dauer < klein.dauer * UNTERSCHIED)
  M.befund(`der Abschuss eines kleinen Gegners klingt ${klein.dauer.toFixed(2)} s, der eines grossen ${xl.dauer.toFixed(2)} s — `
    + `Faktor ${(xl.dauer / klein.dauer).toFixed(2)}, verlangt sind ${UNTERSCHIED}. Ein Spaeher klingt dann wie ein Traeger.`);

M.urteil();

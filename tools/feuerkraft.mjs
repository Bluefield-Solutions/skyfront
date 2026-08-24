#!/usr/bin/env node
/*
  Feuerkraft-Leiter — ist die volle Stufe ueberhaupt erreichbar?

    node tools/feuerkraft.mjs

  WAS DAS HIER NICHT SAGT: ob es sich gut anfuehlt. Das ist in dieser
  Umgebung nicht messbar — SwiftShader rechnet die Simulation auf ein
  Zwanzigstel herunter, jede Aussage ueber Balance waere erfunden (SKY-001).

  WAS ES SAGT: Arithmetik. Wie viele Gegner welcher Groessenklasse ein Sektor
  auffaehrt, wie viele Feuerkraft-Aufsammler daraus im Erwartungswert fallen,
  und nach welchem Anteil des Sektors die volle Stufe erreicht waere — unter
  der ausdruecklichen Annahme: alles abgeraeumt, nie getroffen.

  Gerechnet wird gegen den WELLENPLAN DES SPIELS (window.__SKF_STUFEN) und
  die Fallraten des Spiels (window.__SKF_PWR), nicht gegen nachgebaute.
*/
import { existsSync } from 'node:fs';

if (!existsSync('dist/Skyfront.html')) { console.error('✗ dist/Skyfront.html fehlt — erst bauen.'); process.exit(1); }
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.log('  (—) Feuerkraft: Playwright nicht gefunden — uebersprungen.'); process.exit(2); /* 2 = nicht gemessen, kein Mangel */ }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 } });
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
await seite.waitForFunction(() => window.__game, null, { timeout: 90000 });
await seite.waitForTimeout(1200);

const daten = await seite.evaluate(() => {
  const stufen = window.__SKF_STUFEN, gegner = window.__SKF_GEGNER, pwr = window.__SKF_PWR;
  if (!stufen || !gegner || !pwr || !pwr.gewicht) return { fehler: 'Pruefnaehte fehlen (__SKF_STUFEN / __SKF_GEGNER / __SKF_PWR)' };
  const aus = [];
  for (const [nr, st] of stufen.entries()) {
    const wellen = st.waves || [];
    // Dieselbe Rechnung wie im Spiel: erst das Gesamtgewicht des Sektors,
    // daraus was ein Abschuss einzahlt, dann Welle fuer Welle aufaddieren.
    const gew = (k) => {
      const cfg = gegner[k];
      const c = cfg ? cfg.cls : 'S';
      return pwr.gewicht[c] != null ? pwr.gewicht[c] : pwr.gewicht.S;
    };
    let gesamt = 0;
    const klassen = {};
    for (const w of wellen) {
      gesamt += (w.count || 0) * gew(w.kind);
      const c = gegner[w.kind] ? gegner[w.kind].cls : 'S';
      klassen[c] = (klassen[c] || 0) + w.count;
    }
    const proPunkt = (pwr.max - 1) / Math.max(1, gesamt * pwr.anteil);
    let kum = 0, vollBei = -1;
    for (const [i, w] of wellen.entries()) {
      kum += (w.count || 0) * gew(w.kind) * proPunkt;
      if (vollBei < 0 && kum >= pwr.max - 1) vollBei = i + 1;
    }
    aus.push({
      nr: nr + 1, label: st.label, wellen: wellen.length,
      gegner: Object.values(klassen).reduce((a, b) => a + b, 0),
      klassen, erwartet: kum, vollBei, gesamt, proPunkt,
    });
  }
  return { liste: aus, pwr };
});
await browser.close();

if (daten.fehler) { console.error('✗ ' + daten.fehler); process.exit(1); }
const { liste, pwr } = daten;

console.log('Feuerkraft-Leiter — Erreichbarkeit, nicht Spielgefuehl');
console.log(`Stufen 1..${pwr.max} · Aufsammler +1 · Treffer -${pwr.jeTreffer} (Boden = Meta-Stufe)`);
console.log(`Gewicht je Groessenklasse: ${Object.entries(pwr.gewicht).map(([k, v]) => `${k} ${v}`).join(' · ')} · Zielanteil ${(pwr.anteil * 100).toFixed(0)} %`);
console.log('\nAnnahme: alles abgeraeumt, nie getroffen. Das Guthaben ist nicht zufaellig,\ndie Zahlen sind also exakt und keine Erwartungswerte.\n');
console.log('  Sektor                    Wellen  Gegner   S    M    L   XL     Aufsammler   voll nach');
console.log('                                                                bis zum Ende  Welle');
const befunde = [];
for (const s of liste) {
  const k = (n) => String(s.klassen[n] || 0).padStart(4);
  const anteil = s.vollBei > 0 ? s.vollBei / s.wellen : null;
  console.log(`  ${String(s.nr).padStart(2)} ${(s.label || '').slice(0, 22).padEnd(23)} ${String(s.wellen).padStart(5)} ${String(s.gegner).padStart(7)} ${k('S')} ${k('M')} ${k('L')} ${k('XL')} ${s.erwartet.toFixed(1).padStart(11)}   ${s.vollBei > 0 ? `${s.vollBei} (${(anteil * 100).toFixed(0)} %)` : 'nie'}`);
}

// Zwei Bedingungen, beide arithmetisch pruefbar.
//   1. Volle Stufe muss in JEDEM Sektor erreichbar sein — sonst ist die
//      Leiter in manchen Sektoren nur Zierde.
//   2. Aber nicht zu frueh: wer nach einem Fuenftel oben ist, hat den Rest
//      des Sektors keine Belohnung mehr.
const FRUEH = 0.2, SPAET = 0.8;
for (const s of liste) {
  if (s.vollBei < 0) { befunde.push(`Sektor ${s.nr} (${s.label}): volle Stufe nicht erreichbar — nur ${s.erwartet.toFixed(1)} von ${pwr.max - 1}`); continue; }
  const a = s.vollBei / s.wellen;
  if (a < FRUEH) befunde.push(`Sektor ${s.nr} (${s.label}): volle Stufe schon nach ${(a * 100).toFixed(0)} % des Sektors (Grenze ${FRUEH * 100} %) — danach belohnt nichts mehr`);
  if (a > SPAET) befunde.push(`Sektor ${s.nr} (${s.label}): volle Stufe erst nach ${(a * 100).toFixed(0)} % (Grenze ${SPAET * 100} %) — die Leiter traegt den Sektor nicht`);
}

const anteile = liste.filter((s) => s.vollBei > 0).map((s) => s.vollBei / s.wellen);
if (anteile.length) console.log(`\n  Volle Stufe erreicht nach ${(Math.min(...anteile) * 100).toFixed(0)} bis ${(Math.max(...anteile) * 100).toFixed(0)} % des Sektors (Band ${FRUEH * 100}..${SPAET * 100} %).`);

if (befunde.length) {
  console.log('\nFEUERKRAFT ROT:');
  for (const b of befunde) console.log('  · ' + b);
  process.exit(1);
}
// ---------------------------------------------------------------------
// Zweiter Teil: tut die Leiter im laufenden Spiel auch, was die Rechnung
// oben annimmt? Die Arithmetik oben rechnet mit einer Mechanik — dass es
// sie gibt, muss jemand nachsehen. Sonst bezeugt die Tafel eine Sache,
// ohne sie je geprueft zu haben.
console.log('\nIm laufenden Gefecht nachgesehen:');
const browser2 = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const s2 = await browser2.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await s2.goto('file://' + process.cwd() + '/dist/Skyfront.html');
await s2.waitForFunction(() => window.__game && window.__game.scene.scenes.some((x) => x.scene.isActive()), null, { timeout: 90000 });
await s2.waitForTimeout(2500);
const r = await s2.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height }; });
await s2.touchscreen.tap(r.x + 0.5 * r.w, r.y + 0.711 * r.h);
let drin = false;
for (let i = 0; i < 60; i++) {
  if (await s2.evaluate(() => (window.__game.scene.scenes || []).some((x) => x.scene.key === 'Game' && x.scene.isActive()))) { drin = true; break; }
  await s2.waitForTimeout(250);
}
if (!drin) { befunde.push('kommt nicht ins Gefecht — die Leiter ist nicht nachgesehen'); }
else {
  await s2.waitForTimeout(2500);
  const probe = await s2.evaluate(async () => {
    const g = window.__game, sp = g.scene.getScene('Game');
    const warte = (ms) => new Promise((f) => setTimeout(f, ms));
    const aus = {};
    aus.geeicht = { proPunkt: sp.pwrProPunkt, gesamt: sp.pwrGewichtGesamt };
    sp.player.powerLevel = sp.player.powerFloor = 1;
    aus.vorher = sp.player.powerLevel;
    // Aufsammler direkt vor die Maschine legen und einsammeln lassen.
    sp.dropPU('power', sp.player.x, sp.player.y - 70);
    for (let i = 0; i < 40 && sp.player.powerLevel === aus.vorher; i++) await warte(120);
    aus.nachAufsammeln = sp.player.powerLevel;
    // Treffer: kostet eine Stufe, aber nie unter den Boden.
    sp.player.invulnUntil = 0; sp.player.shieldUntil = 0;
    sp.player.hit(sp.time.now, 1);
    aus.nachTreffer = sp.player.powerLevel;
    sp.player.invulnUntil = 0;
    sp.player.hit(sp.time.now, 1);
    aus.nachZweitemTreffer = sp.player.powerLevel;
    aus.boden = sp.player.powerFloor;
    // und der Abschuss zahlt ein
    sp.player.powerLevel = 1; sp.pwrGuthaben = 0;
    const vorGut = sp.pwrGuthaben;
    sp.maybeDropPower(sp.player.x, 200, 'XL');
    aus.guthabenNachXL = sp.pwrGuthaben - vorGut;
    return aus;
  });
  await browser2.close();
  const z = (n, v) => console.log(`  ${n.padEnd(34)} ${v}`);
  z('Guthaben je Gewichtspunkt', probe.geeicht.proPunkt ? probe.geeicht.proPunkt.toFixed(4) : '—');
  z('Stufe vor dem Aufsammler', probe.vorher);
  z('Stufe nach dem Aufsammler', probe.nachAufsammeln);
  z('Stufe nach einem Treffer', probe.nachTreffer);
  z('Stufe nach dem zweiten Treffer', `${probe.nachZweitemTreffer} (Boden ${probe.boden})`);
  z('Guthaben aus einem XL-Abschuss', probe.guthabenNachXL.toFixed(4));
  if (!probe.geeicht.proPunkt) befunde.push('pwrProPunkt ist beim Sektorstart nicht gesetzt — die Leiter ist nicht geeicht');
  if (probe.nachAufsammeln !== probe.vorher + 1) befunde.push(`Aufsammler hebt die Stufe nicht (${probe.vorher} → ${probe.nachAufsammeln})`);
  if (probe.nachTreffer !== probe.nachAufsammeln - 1) befunde.push(`Treffer kostet keine Stufe (${probe.nachAufsammeln} → ${probe.nachTreffer})`);
  if (probe.nachZweitemTreffer < probe.boden) befunde.push(`Treffer druecken unter den Boden (${probe.nachZweitemTreffer} < ${probe.boden})`);
  if (!(probe.guthabenNachXL > 0)) befunde.push('ein XL-Abschuss zahlt nichts ein');
}

if (befunde.length) {
  console.log('\nFEUERKRAFT ROT:');
  for (const b of befunde) console.log('  · ' + b);
  process.exit(1);
}
console.log('\nFEUERKRAFT GRÜN — die Leiter ist erreichbar, traegt jeden Sektor und tut es auch.');

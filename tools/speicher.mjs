#!/usr/bin/env node
/*
  Speicher-Tafel — was liegt im Gefecht an Texturen im Speicher?

    node tools/speicher.mjs

  Warum das ein Tor verdient: auf iOS beendet Safari eine Seite, die zu viel
  Grafikspeicher haelt, ohne Vorwarnung. Und die teuerste Zeile ist eine, die
  niemand sieht — beim Start entstanden zehn Verlaufskulissen zu je 1,11 MB,
  von denen KEINE der 120 Sektoren je eine benutzt. 9,99 MB, die von der
  ersten Sekunde an dalagen.

  HIER IST EINE ABSOLUTE GRENZE AUSNAHMSWEISE RICHTIG. Sonst gilt: Grenzen
  anteilig, nie absolut — weil dieselbe Szene je nach Chromium und Rasterung
  anders MISST. Texturspeicher misst sich nicht, er rechnet sich: Breite mal
  Hoehe mal vier, aus Bildern, die im Buendel liegen. Derselbe Build gibt auf
  jedem Rechner dieselbe Zahl.
*/
import { existsSync } from 'node:fs';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Speicher', 'der Bestand bleibt unter den Deckeln, und nichts liegt ohne Grund darin.');

// Der Anteil, den der CODE bestimmt — ohne die Biombilder, die je nach Sektor
// verschieden gross sind (Stadt 21,7 MB, Ozean 6,7 MB). Gemessen: 34,6 MB.
const OHNE_BIOME_MAX = 40;
// Und ein Deckel ueber alles, damit ein neues Riesenbild nicht unbemerkt
// hereinkommt. Gemessen im Stadtsektor: 63,0 MB.
const GESAMT_MAX = 78;

if (!existsSync('dist/Skyfront.html')) M.abbruch('dist/Skyfront.html fehlt — erst bauen.');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.abbruch('Playwright nicht gefunden.'); }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
// Der Hebel fuer die Gegenprobe: NICHT auf die laufende Szene warten,
// sondern messen, sobald es das Spiel gibt. Dann ist der Vorrat wirklich
// noch im Zulauf — das ist kein nachgestellter Zustand, sondern derselbe,
// den ein zu frueh messendes Tor antrifft.
await seite.waitForFunction(() => window.__game, null, { timeout: 90000 });
if (!OHNE_NAHT) {
  await seite.waitForFunction(() => window.__game.scene.scenes.some((s) => s.scene.isActive()), null, { timeout: 90000 });
  await seite.waitForTimeout(3000);
}

// Ins Gefecht — im Menue liegt ein anderer Bestand.
const r = OHNE_NAHT ? { x: 0, y: 0, w: 0, h: 0 } : await seite.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height }; });
if (!OHNE_NAHT) await seite.touchscreen.tap(r.x + 0.5 * r.w, r.y + 0.711 * r.h);
let drin = OHNE_NAHT;
for (let i = 0; !drin && i < 60; i++) {
  if (await seite.evaluate(() => (window.__game.scene.scenes || []).some((s) => s.scene.key === 'Game' && s.scene.isActive()))) { drin = true; break; }
  await seite.waitForTimeout(250);
}
// Bleibt ein Befund, aus demselben Grund wie in der Feuerkraft-Tafel:
// "gruen, aber man kommt nicht ins Spiel" darf nie leise durchgehen.
if (!drin) { console.error('✗ Speicher-Tafel: kommt nicht ins Gefecht.'); await browser.close(); process.exit(1); }
if (!OHNE_NAHT) await seite.waitForTimeout(3500);

// Ist der Bestand ueberhaupt zur Ruhe gekommen?
//
// Hier stand eine Grenze `liste.length < 100`, und die konnte praktisch nie
// fallen: nachgemessen sind es im Menue 119 und im Gefecht 125 Texturen.
// Nur im allerersten Augenblick nach `window.__game` waren es 99 — eine
// Grenze, die einen Wert von 99 verlangt, wo der kleinste je beobachtete
// 119 ist, meldet nie etwas. (Eiserne Regel: Grenzen anteilig, nie absolut;
// und eine Pruefung, die nie etwas meldet, ist kein Beweis.)
//
// Gefragt ist nicht "sind es genug", sondern "aendert es sich noch". Zwei
// Messungen im Abstand einer halben Sekunde: bleiben sie gleich, ist der
// Vorrat fertig geladen und die MB-Zahlen sind belastbar. Bleiben sie es
// nicht, misst die Tafel einen Zwischenstand — und darf darueber nicht
// urteilen.
//
// Gezaehlt wird dabei OHNE die Kachelpuffer, die Phaser je TileSprite
// anlegt (ihre Namen sind GUIDs). Nachgemessen: die schwanken im Gefecht
// von Bild zu Bild — 141, eine halbe Sekunde spaeter 139, bei unveraenderten
// 63,0 MB. Auf sie zu warten hiesse, auf etwas zu warten, das nie eintritt:
// die erste Fassung dieser Pruefung meldete deshalb "nicht gemessen" auf
// einem vollkommen gesunden Lauf. Was zur Ruhe kommen MUSS, ist der
// Bestand, den der Code laedt.
const zaehlen = () => seite.evaluate(() => {
  let n = 0, mb = 0;
  const g = window.__game;
  for (const k in g.textures.list) {
    const q = g.textures.list[k].source[0];
    if (!q || !q.width) continue;
    mb += q.width * q.height * 4 / 1048576;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(k)) n++;
  }
  return { n, mb: Math.round(mb * 10) / 10 };
});
const ruheA = await zaehlen();
await seite.waitForTimeout(500);
const ruheB = await zaehlen();
const beruhigt = ruheA.n === ruheB.n && ruheA.mb === ruheB.mb;

const daten = await seite.evaluate(() => {
  const g = window.__game;
  const l = [];
  for (const k in g.textures.list) {
    const q = g.textures.list[k].source[0];
    if (!q || !q.width) continue;
    l.push({ k, w: q.width, h: q.height, mb: q.width * q.height * 4 / 1048576 });
  }
  l.sort((a, b) => b.mb - a.mb);
  const sp = g.scene.getScene('Game');
  return { liste: l, biom: sp && sp.bodenKey ? sp.bodenKey : '?' };
});
await browser.close();

const { liste, biom } = daten;
const gesamt = liste.reduce((a, x) => a + x.mb, 0);
const biome = liste.filter((x) => /^bg_/.test(x.k));
const ohneBiome = gesamt - biome.reduce((a, x) => a + x.mb, 0);
// Die Kachel-Fuellpuffer, die Phaser je TileSprite anlegt: Namen sind GUIDs.
const kachel = liste.filter((x) => /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(x.k));

console.log(`Speicher-Tafel — im Gefecht, Biom ${biom}`);
console.log(`${liste.length} Texturen, zusammen ${gesamt.toFixed(1)} MB\n`);
console.log('  Textur                Groesse         MB');
for (const x of liste.slice(0, 10))
  console.log(`  ${(/^[0-9a-f]{8}-/.test(x.k) ? '(Kachelpuffer)' : x.k).padEnd(21)} ${String(x.w).padStart(4)}x${String(x.h).padEnd(5)} ${x.mb.toFixed(2).padStart(6)}`);
console.log(`\n  Biombilder            ${biome.length} Stueck  ${biome.reduce((a, x) => a + x.mb, 0).toFixed(1).padStart(6)} MB`);
console.log(`  Kachelpuffer (Phaser) ${kachel.length} Stueck  ${kachel.reduce((a, x) => a + x.mb, 0).toFixed(1).padStart(6)} MB`);
console.log(`  Alles uebrige                  ${(ohneBiome - kachel.reduce((a, x) => a + x.mb, 0)).toFixed(1).padStart(6)} MB`);
console.log(`\n  Ohne Biombilder: ${ohneBiome.toFixed(1)} MB (Grenze ${OHNE_BIOME_MAX}) · Gesamt: ${gesamt.toFixed(1)} MB (Grenze ${GESAMT_MAX})`);

const befunde = [];

// Die neun Verlaufskulissen duerfen NICHT dasein, solange kein Sektor sie
// benutzt. Genau das war der Befund, und genau das kann zurueckkommen.
const FAUL = ['bg_coast', 'bg_storm', 'bg_dusk', 'bg_night', 'bg_clouds', 'bg_volcano', 'bg_ice', 'bg_enemy', 'bg_finale'];
const daOhneGrund = FAUL.filter((k) => liste.some((x) => x.k === k));
console.log(`  Verlaufskulissen auf Vorrat: ${daOhneGrund.length} von ${FAUL.length}`);
if (daOhneGrund.length)
  befunde.push(`${daOhneGrund.length} Verlaufskulissen liegen im Speicher, ohne dass ein Sektor sie benutzt: ${daOhneGrund.join(' ')} (${(daOhneGrund.length * 1.11).toFixed(1)} MB)`);

if (ohneBiome > OHNE_BIOME_MAX) befunde.push(`Ohne Biombilder ${ohneBiome.toFixed(1)} MB — ueber der Grenze ${OHNE_BIOME_MAX} MB`);
if (gesamt > GESAMT_MAX) befunde.push(`Gesamt ${gesamt.toFixed(1)} MB — ueber der Grenze ${GESAMT_MAX} MB`);
// „Zu frueh gemessen" ist kein Mangel am Spiel, sondern einer an dieser
// Messung — und zugleich der Grund, warum ihre Zahlen dann nichts wert
// sind. Bis hierher stand es als Befund und haette einen roten Lauf
// erzeugt, der nichts ueber das Spiel sagt.
if (!beruhigt)
  M.ungemessen(`der Texturbestand aendert sich noch (${ruheA.n} Texturen / ${ruheA.mb} MB, eine halbe Sekunde spaeter ${ruheB.n} / ${ruheB.mb} MB) — gemessen wurde ein Zwischenstand, die Zahlen oben sind nicht belastbar`);
else console.log(`  Bestand beruhigt: zweimal ${ruheB.n} geladene Texturen / ${ruheB.mb} MB im Abstand einer halben Sekunde.`);
for (const b of befunde) M.befund(b);
M.urteil();

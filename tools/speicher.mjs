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

// Der Anteil, den der CODE bestimmt — ohne die Biombilder, die je nach Sektor
// verschieden gross sind (Stadt 21,7 MB, Ozean 6,7 MB). Gemessen: 34,6 MB.
const OHNE_BIOME_MAX = 40;
// Und ein Deckel ueber alles, damit ein neues Riesenbild nicht unbemerkt
// hereinkommt. Gemessen im Stadtsektor: 63,0 MB.
const GESAMT_MAX = 78;

if (!existsSync('dist/Skyfront.html')) { console.error('✗ dist/Skyfront.html fehlt — erst bauen.'); process.exit(1); }
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.log('  (—) Speicher-Tafel: Playwright nicht gefunden — uebersprungen.'); process.exit(0); }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
await seite.waitForFunction(() => window.__game && window.__game.scene.scenes.some((s) => s.scene.isActive()), null, { timeout: 90000 });
await seite.waitForTimeout(3000);

// Ins Gefecht — im Menue liegt ein anderer Bestand.
const r = await seite.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height }; });
await seite.touchscreen.tap(r.x + 0.5 * r.w, r.y + 0.711 * r.h);
let drin = false;
for (let i = 0; i < 60; i++) {
  if (await seite.evaluate(() => (window.__game.scene.scenes || []).some((s) => s.scene.key === 'Game' && s.scene.isActive()))) { drin = true; break; }
  await seite.waitForTimeout(250);
}
if (!drin) { console.error('✗ Speicher-Tafel: kommt nicht ins Gefecht.'); await browser.close(); process.exit(1); }
await seite.waitForTimeout(3500);

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
if (liste.length < 100) befunde.push(`nur ${liste.length} Texturen gefunden — da wurde zu frueh gemessen`);

if (befunde.length) {
  console.log('\nSPEICHER ROT:');
  for (const b of befunde) console.log('  · ' + b);
  process.exit(1);
}
console.log('\nSPEICHER GRÜN.');

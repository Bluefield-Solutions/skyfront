#!/usr/bin/env node
/*
  Backt die gelieferten Rohbilder in src/assets.js ein.

    node tools/einbau.mjs [--trocken]

  WAS HIER PASSIERT — und warum genau so:

  1. GROESSE. Die Kamera zoomt zweifach: Welt 540 breit, Puffer 1080. Eine
     Textur ist also dann punktgenau, wenn sie doppelt so breit ist wie das
     Schiff im Bild stehen soll, und mit setScale(.5) gezeichnet wird. Genau
     das wird hier gebacken. Die Breite in Weltpunkten ist gesetzt (sie
     steht in docs/BILDAUFTRAEGE-BOSSE.md, Abschnitt 3), die Hoehe folgt dem
     Bild.

  2. DREHUNG. Die neuen Bilder sind mit der Nase nach UNTEN gezeichnet, das
     Spiel dreht den Boss aber um 180 Grad. Statt die Drehung aus dem Code
     zu nehmen, wird das Bild beim Einbacken gedreht. Zwei Gruende: die
     Drehung im Code ist eine Zeile, die auch der prozedurale Rueckfall
     braucht (boss2 und boss3 werden gezeichnet, bevor die Base64-Bilder
     nachgeladen sind — ohne setAngle stuenden die kurz auf dem Kopf), und
     auf dem Schirm kommt dasselbe heraus: zweimal gedreht ist nicht
     gedreht. Auch das eingebackene Licht landet wieder oben links.

  3. RAND. Acht durchsichtige Punkte ringsum, in ZIELgroesse gerechnet.
     Ein Rand im Quellbild waere nach dem Verkleinern nicht mehr acht Punkte.

  4. WEBP STATT PNG. Gemessen an denselben drei Bildern: PNG 1577 KB, WebP
     bei Qualitaet 88 nur 273 KB. Die Bahnen in assets.js sind laengst WebP,
     das Format ist also nicht neu. 273 KB gegen die 58 KB von heute sind
     der Preis fuer Bilder, die nicht mehr hochgerechnet werden.

  Regel 9 aus CLAUDE.md gilt: ein Eintrag in assets.js darf ERSETZT, aber
  nie entfernt werden. Die Nummern sind Positionen, die app.js anspringt.
*/
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { messstelle } from './messstelle.mjs';

const M = messstelle('Einbau', 'alle Bilder sitzen in ihrer Zielgroesse in assets.js.');
const TROCKEN = process.argv.includes('--trocken');

const RAND = 8;             // durchsichtige Punkte ringsum, in Zielgroesse
const QUALITAET = 88;

// Breite in WELTpunkten. Die Texturbreite ist das Doppelte (Zoom 2).
// Quelle: docs/BILDAUFTRAEGE-BOSSE.md, Abschnitt 3.
export const EINBAU = [
  { datei: 'art/roh/boss/boss_sturmkanzel.png',   platz: 16, schluessel: 'boss1', welt: 340 },
  { datei: 'art/roh/boss/boss_schwarmmutter.png', platz: 17, schluessel: 'boss2', welt: 430 },
  { datei: 'art/roh/boss/boss_lanzentraeger.png', platz: 18, schluessel: 'boss3', welt: 260 },
];

async function inhalt(datei) {
  const { data, info } = await sharp(datei).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (data[(y * W + x) * C + 3] < 24) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

const roh = readFileSync('src/assets.js', 'utf8');
const auf = roh.indexOf('['), zu = roh.lastIndexOf(']');
const liste = JSON.parse(roh.slice(auf, zu + 1));

console.log(`Einbau — ${EINBAU.length} Bild(er)${TROCKEN ? ' (trocken)' : ''}\n`);
console.log('  Schluessel  Quelle          Textur      Welt        vorher    nachher');

let vorher = 0, nachher = 0;
for (const e of EINBAU) {
  if (!existsSync(e.datei)) { M.ungemessen(`${e.datei} fehlt — Platz ${e.platz} bleibt, wie er ist.`); continue; }
  const bb = await inhalt(e.datei);
  if (!bb) { M.ungemessen(`${e.datei}: kein deckender Bildpunkt.`); continue; }

  const zielBreite = e.welt * 2;                       // Zoom 2
  const innen = zielBreite - 2 * RAND;
  if (innen < 32) { M.befund(`${e.schluessel}: Zielbreite ${zielBreite} zu klein fuer ${RAND} Punkte Rand.`); continue; }

  const bild = await sharp(e.datei).extract(bb)
    .resize(innen, null, { kernel: 'lanczos3' })
    .extend({ top: RAND, bottom: RAND, left: RAND, right: RAND, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .rotate(180)                                        // siehe Punkt 2 im Kopf
    .webp({ quality: QUALITAET, alphaQuality: 90 }).toBuffer();

  const m = await sharp(bild).metadata();
  if (m.width !== zielBreite)
    M.befund(`${e.schluessel}: ${m.width} statt ${zielBreite} Punkte breit — die Rechnung stimmt nicht.`);

  const alt = liste[e.platz];
  const altBytes = Buffer.from(alt.slice(alt.indexOf(',') + 1), 'base64').length;
  vorher += altBytes; nachher += bild.length;

  console.log(`  ${e.schluessel.padEnd(11)} ${e.datei.split('/').pop().replace('.png', '').padEnd(15)} `
    + `${(m.width + 'x' + m.height).padEnd(11)} ${(e.welt + 'x' + Math.round(m.height / 2)).padEnd(11)} `
    + `${(altBytes / 1024).toFixed(0).padStart(5)} KB ${(bild.length / 1024).toFixed(0).padStart(6)} KB`);

  if (!TROCKEN) liste[e.platz] = 'data:image/webp;base64,' + bild.toString('base64');
}

if (!TROCKEN && !M.hatBefund()) {
  writeFileSync('src/assets.js', roh.slice(0, auf) + JSON.stringify(liste) + roh.slice(zu + 1));
  console.log('\n✓ src/assets.js geschrieben.');
}
console.log(`\n  Bildvorrat: ${(vorher / 1024).toFixed(0)} KB → ${(nachher / 1024).toFixed(0)} KB`);
console.log('  Im Spiel gehoert dazu setScale(.5) — die Textur ist doppelt so breit wie das Schiff.');

M.urteil();

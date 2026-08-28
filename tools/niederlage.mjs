#!/usr/bin/env node
/*
  Niederlage — kommt man aus dem Ergebnisbildschirm wieder heraus?

    node tools/niederlage.mjs

  DER ANLASS, gespielt und berichtet: „Als der Boss gekommen ist und ich
  gegen den Boss verloren habe, kann man festhaengen im Bildschirm."

  Bis v44 war der einzige Weg hinaus ein Tipp irgendwohin — der globale
  pointerdown-Handler sprang bei `over` sofort zur Weltkarte. Wer beim
  Sterben noch den Finger auf dem Schirm hatte, loeste ihn im selben
  Augenblick aus und sah den Bildschirm nie; wer wartete, las nur einen
  kleinen blassen Hinweis. Kein Tor hat davon je etwas gewusst: der
  Rauchtest prueft, dass man ins Spiel KOMMT.

  GEMESSEN WIRD DER GANZE WEG, an der gebauten Datei im Browser:
    1. ins Gefecht,
    2. Spieler auf null Leben, gameOver(),
    3. stehen die zwei Knoepfe da, und sind sie mit dem Daumen zu treffen?
    4. traegt ein Tipp auf „Zum Hangar" wirklich aus der Szene heraus?

  Schritt 4 ist der eigentliche Punkt. Ein Knopf, den man sieht und der
  nichts tut, ist schlimmer als keiner — und genau das war der erste
  Entwurf: Tt() legt eine interaktive Zone an, und im Gefecht kam an ihr
  kein einziger Tipp an.
*/
import { existsSync } from 'node:fs';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Niederlage', 'aus dem Ergebnisbildschirm fuehren zwei Knoepfe heraus.');
// 44 Anzeigepunkte sind das Daumenmass, mit dem auch npm run browser rechnet.
const DAUMEN = 44;

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
await seite.waitForTimeout(8000);

const abschuss = await seite.evaluate(() => {
  const g = window.__game.scene.getScene('Game');
  try { g.player.hp = 0; g.gameOver(); } catch (e) { return { fehler: e.message }; }
  return { over: g.over };
});
if (abschuss.fehler) { await browser.close(); M.abbruch(`gameOver() wirft: ${abschuss.fehler}`); }
await seite.waitForTimeout(900);

const schirm = await seite.evaluate(() => {
  const g = window.__game.scene.getScene('Game');
  return {
    over: g.over,
    knoepfe: (g.endeKnoepfe || []).map((k) => ({ x: k.x, y: k.y, w: k.w, h: k.h })),
    texte: g.children.list.filter((o) => o.type === 'Text' && o.visible).map((o) => o.text),
    // WELTmasse, nicht Puffermasse. Die Leinwand ist 540 x 960 gross und
    // wird mit Zoom 2 in einen Puffer von 1080 x 1920 gezeichnet — wer
    // scale.height nimmt, rechnet den Knopf auf ein Drittel seiner
    // wirklichen Hoehe herunter und tippt daneben. Genau das ist beim
    // ersten Lauf passiert, und der Befund las sich wie ein toter Knopf.
    hoehe: window.__game.scale.height / 2,
    breite: window.__game.scale.width / 2,
  };
});
if (OHNE_NAHT) schirm.knoepfe = [];

console.log('Niederlage — der Weg aus dem Ergebnisbildschirm\n');
console.log(`  over: ${schirm.over}`);
console.log(`  Knoepfe: ${schirm.knoepfe.length}`);
for (const k of schirm.knoepfe) console.log(`    ${k.w} x ${k.h} bei y ${Math.round(k.y)} von ${schirm.hoehe}`);
const beschriftet = schirm.texte.filter((t) => /Nochmal|Hangar|Menü/.test(t));
console.log(`  Beschriftungen: ${beschriftet.join('  ·  ') || '—'}`);

if (!schirm.over) M.befund('nach dem Abschuss steht das Spiel nicht auf "over" — dann kommt gar kein Ergebnisbildschirm.');
if (schirm.knoepfe.length < 2)
  M.befund(`der Ergebnisbildschirm hat ${schirm.knoepfe.length} Knopf/Knoepfe statt zwei. `
    + `Ohne sie ist der einzige Weg hinaus ein Tipp ins Leere, und den findet niemand.`);
for (const k of schirm.knoepfe)
  if (k.h < DAUMEN) M.befund(`ein Knopf ist nur ${k.h} Punkte hoch, das Daumenmass sind ${DAUMEN}.`);
if (beschriftet.length < 2)
  M.befund(`nur ${beschriftet.length} Knopf/Knoepfe tragen eine Beschriftung, die sagt, wohin er fuehrt.`);
if (schirm.knoepfe.some((k) => k.y + k.h / 2 > schirm.hoehe))
  M.befund('ein Knopf liegt unterhalb des Bildschirmrands.');

// Und der Punkt, an dem der erste Entwurf gescheitert ist: fuehrt der
// Knopf wirklich hinaus?
if (schirm.knoepfe.length >= 2) {
  const k = schirm.knoepfe[1];
  await seite.touchscreen.tap(r.x + r.w * (k.x / schirm.breite), r.y + r.h * (k.y / schirm.hoehe));
  await seite.waitForTimeout(2500);
  const raus = await seite.evaluate(() => window.__game.scene.scenes.filter((s) => s.scene.isActive()).map((s) => s.scene.key));
  console.log(`  nach dem Tipp auf den unteren Knopf: ${raus.join(', ')}`);
  if (raus.includes('Game'))
    M.befund('der Tipp auf den unteren Knopf fuehrt nicht aus dem Gefecht heraus — der Knopf ist zu sehen und tut nichts.');
}

await browser.close();
M.urteil();

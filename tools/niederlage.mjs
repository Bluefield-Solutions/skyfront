#!/usr/bin/env node
/*
  Ergebnis — kommt man aus BEIDEN Ergebnisbildschirmen wieder heraus?

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

  UND SEIT v56 DERSELBE WEG NACH EINEM SIEG.
  Das ist nachgetragen, weil dieses Tor eine halbe Tuer geprueft hat und
  die andere Haelfte sieben Fassungen lang offenstand:

  In v49 bekam der NIEDERLAGEN-Schirm zwei Knoepfe, und der
  pointerdown-Handler der Szene wurde darauf umgestellt — er prueft
  seither `endeKnoepfe` und verwirft jeden Tipp, der keinen davon trifft.
  Der SIEGES-Schirm setzte keine. Er sagt "Tippen → Weltkarte", und ab v49
  verwarf der Handler genau diesen Tipp: nach JEDEM gewonnenen Level kam
  man nicht mehr zurueck zur Karte.

  Gefunden hat es der Nutzer nach Level 20, nicht dieses Tor — es hiess
  "Niederlage" und hat gemessen, was sein Name sagt. Ein Tor, das eine von
  zwei Tueren prueft, meldet gruen ueber ein Haus, aus dem man nicht
  herauskommt.
*/
import { existsSync } from 'node:fs';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Ergebnis', 'aus BEIDEN Ergebnisbildschirmen fuehrt ein Weg heraus.');
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

// ---- UND DER SIEG ----------------------------------------------------------
//
// Frischer Sektor, gewonnen, und dieselbe Frage: fuehrt ein Tipp hinaus?
// Gemessen wird in der KAMPAGNE, nicht im Endlosmodus — dort gibt es keine
// Weltkarte, auf die man zurueckkehren koennte.
console.log('\nSieg — der Weg aus dem Ergebnisbildschirm\n');
const sieg = await seite.evaluate(async () => {
  const g = window.__game;
  for (let i = 0; i < 120; i++) {
    const m = g.scene.getScene('Menu');
    if (m && m.scene.isActive()) break;
    await new Promise((f) => setTimeout(f, 250));
  }
  g.scene.getScenes(true).forEach((z) => z.scene.key !== 'Boot' && z.scene.stop());
  g.scene.start('Game', { stage: 5, difficulty: 'easy' });
  await new Promise((f) => setTimeout(f, 1500));
  const spiel = g.scene.getScene('Game');
  // Die Einweisung wird nicht weggetippt, sondern uebergangen — dieselbe
  // Lehre wie in vorwaermen.mjs und speicher.mjs: getippt hat es nie
  // funktioniert, gerufen immer.
  for (let i = 0; i < 20 && !spiel.wellenplan; i++) await new Promise((f) => setTimeout(f, 500));
  if (!spiel.wellenplan) {
    try { spiel.startStage(); } catch (e) { return { fehler: 'startStage(): ' + e.message }; }
    await new Promise((f) => setTimeout(f, 2500));
  }
  if (!spiel.wellenplan) return { fehler: 'Sektor startet nicht' };
  try { spiel.completeLevel(); } catch (e) { return { fehler: 'completeLevel() wirft: ' + e.message }; }
  await new Promise((f) => setTimeout(f, 4000));
  return {
    over: spiel.over,
    knoepfe: (spiel.endeKnoepfe || []).map((k) => ({ x: k.x, y: k.y, w: k.w, h: k.h })),
    hinweis: spiel.children.list.some((o) => o.type === 'Text' && o.visible && /Tippen/.test(String(o.text || ''))),
  };
});
if (sieg.fehler) M.ungemessen(`der Sieg ist nicht messbar: ${sieg.fehler}`);
else {
  if (OHNE_NAHT) sieg.knoepfe = [];
  console.log(`  over: ${sieg.over} · Tippflaechen: ${sieg.knoepfe.length} · Hinweis "Tippen": ${sieg.hinweis ? 'ja' : 'nein'}`);
  if (!sieg.over) M.befund('nach dem gewonnenen Level steht das Spiel nicht auf "over".');
  if (!sieg.knoepfe.length)
    M.befund('der Siegesbildschirm hat KEINE Tippflaeche. Der Handler der Szene verwirft bei "over" '
      + 'jeden Tipp, der keinen Knopf trifft — man kommt nach einem gewonnenen Level nicht mehr zur Weltkarte.');
  else {
    const k = sieg.knoepfe[0];
    await seite.touchscreen.tap(r.x + r.w * (k.x / schirm.breite), r.y + r.h * (k.y / schirm.hoehe));
    await seite.waitForTimeout(2500);
    const raus = await seite.evaluate(() => window.__game.scene.scenes.filter((s) => s.scene.isActive()).map((s) => s.scene.key));
    console.log(`  nach dem Tipp: ${raus.join(', ')}`);
    if (raus.includes('Game'))
      M.befund('der Tipp auf dem Siegesbildschirm fuehrt nicht aus dem Gefecht heraus.');
  }
}

await browser.close();
M.urteil();

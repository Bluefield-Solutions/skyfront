#!/usr/bin/env node
/*
  Sektor — was haelt ein Sektor ueber seine ganze Laufzeit im Bild?

    node tools/sektor.mjs

  DER ANLASS. Seit SKY-268 stand die Frage offen: woraus bestehen die 519
  Anzeigeobjekte, die das Geraet in Sektor 106 gemeldet hat, wenn nur
  15 Gegner und 86 Geschosse aktiv sind? Die Antwort hiess immer „diese
  Umgebung kann die Last nicht herstellen" — neun Sekunden Sektor 106
  unter SwiftShader ergaben 95 Objekte und keinen einzigen Gegner.

  DAS WAR EIN IRRTUM UEBER DEN FLASCHENHALS. Nicht das Rechnen war zu
  langsam, sondern das ZEICHNEN. Wer das Zeichnen abschaltet und die
  Spielschleife von Hand taktet, rechnet 90 Sekunden Spielzeit in gut
  vier Sekunden Wanduhr — mit derselben Wellensteuerung, derselben
  Physik, denselben Vorraeten.

      g.renderer.render = () => {};
      for (let i = 0; i < N; i++) g.loop.step(t += 16.7);

  DAS IST EIN RIG, KEIN SPIEL, und es steht hier, damit niemand die
  Zahlen fuer Spielerfahrung haelt:
    · Der Spieler ist unverwundbar — sonst endet der Lauf nach zwanzig
      Sekunden und misst das Sterben statt den Sektor.
    · Er weicht nicht aus und zielt nicht. Er trifft also weniger als ein
      Mensch, und es leben MEHR Gegner als im echten Spiel (das Geraet sah
      15, hier sind es 54). Fuer die Frage „waechst die Liste" ist das die
      unguenstigere Seite, und damit die richtige.
    · Bildzeiten sagt das hier NICHT. Die Schrittweite ist gesetzt.

  WAS GEMESSEN WIRD:

    A  Der Sektor laeuft 90 s Spielzeit durch, ohne stehenzubleiben.
    B  Die Anzeigeliste laeuft in eine EBENE. Waechst das letzte Drittel
       deutlich ueber das mittlere, laeuft etwas aus dem Ruder.
    C  Aufgeraeumt wird auch in einem VOLLEN Sektor. Bis v66 hing das an
       „hoechstens zwei Gegner im Bild" — in Sektor 106 traf das auf
       0,7 % der Bilder zu, und es wurde in 90 Sekunden genau einmal
       aufgeraeumt.
    D  Der Anteil abgeschalteter Objekte in der Liste bleibt in Grenzen.

  Und die Zerlegung wird ausgegeben: wem jedes Objekt gehoert. Das ist
  die Antwort auf SKY-268, und sie braucht kein Telefon mehr.

  `--ohne-naht` nimmt den Zugriff auf die Spielschleife weg und verlangt
  die Rueckgabe 2.
*/
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Sektor', 'die Anzeigeliste laeuft in eine Ebene, und aufgeraeumt wird auch im vollen Sektor.');

if (!existsSync('dist/Skyfront.html')) M.abbruch('dist/Skyfront.html fehlt — erst bauen.');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.abbruch('Playwright nicht gefunden.'); }

const TYP = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const server = createServer((an, aw) => {
  const pfad = decodeURIComponent(an.url.split('?')[0]);
  const datei = join('dist', normalize(pfad).replace(/^(\.\.[/\\])+/, ''));
  if (!existsSync(datei) || statSync(datei).isDirectory()) { aw.writeHead(404).end(); return; }
  const roh = readFileSync(datei);
  aw.writeHead(200, { 'Content-Type': TYP[extname(datei)] || 'application/octet-stream', 'Content-Length': roh.length }).end(roh);
});
await new Promise((f) => server.listen(0, '127.0.0.1', f));

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
await seite.addInitScript(() => { try { localStorage.setItem('seen_tut', '1'); } catch (e) {} });
await seite.goto(`http://127.0.0.1:${server.address().port}/Skyfront.html`);
await seite.waitForFunction(() => window.__game && window.__bootStats && window.__bootStats.totalMs, null, { timeout: 90000 });
await seite.waitForTimeout(1200);

if (OHNE_NAHT) await seite.evaluate(() => { try { window.__game.loop.step = null; } catch (e) {} });

const SEKUNDEN = 90;
const lauf = (stage, sekunden) => seite.evaluate(async ({ stage, sekunden }) => {
  const g = window.__game;
  if (!g || !g.loop || typeof g.loop.step !== 'function') return { fehler: 'an die Spielschleife ist nicht heranzukommen' };
  (g.scene.scenes || []).forEach((s) => { if (s.scene.key !== 'Boot' && s.scene.isActive()) g.scene.stop(s.scene.key); });
  g.scene.start('Game', { stage });
  let sp = null;
  for (let i = 0; i < 40; i++) {
    await new Promise((f) => setTimeout(f, 200));
    sp = (g.scene.scenes || []).find((s) => s.scene.key === 'Game' && s.scene.isActive());
    if (!sp) continue;
    if (!sp.stageStarted && typeof sp.startStage === 'function') sp.startStage();
    if (sp.player) break;
  }
  if (!sp || !sp.player) return { fehler: 'das Gefecht kommt nicht hoch' };
  const altR = g.renderer.render;
  g.renderer.render = function () {};
  const SCHRITT = 16.7, N = Math.round(sekunden * 1000 / SCHRITT);
  let t = performance.now();
  const verlauf = [];
  let offen = 0, schritte = 0;
  const t0 = performance.now();
  try {
    for (let i = 0; i < N; i++) {
      if (sp.player) { sp.player.shieldUntil = 1e12; sp.lives = 9; }
      g.loop.step(t += SCHRITT);
      if (!sp.scene.isActive()) break;
      schritte++;
      if (sp.enemies.countActive(true) <= 2 && !(sp.boss && sp.boss.active)) offen++;
      if (i % 100 === 0) verlauf.push([Math.round(i * SCHRITT / 1000), sp.children.list.length]);
    }
  } catch (e) { g.renderer.render = altR; return { fehler: 'Schleife gestolpert: ' + e }; }
  const dauer = performance.now() - t0;

  // Wem gehoert jedes Objekt? Zugeordnet, nicht geraten.
  const flach = [];
  const geh = (arr) => { for (const o of arr) { flach.push(o); if (o.list) geh(o.list); } };
  geh(sp.children.list);
  const mengen = [];
  const dazu = (n, q) => { const m = new Set(); if (q) for (const o of q) m.add(o); mengen.push([n, m]); };
  dazu('Gegner', sp.enemies && sp.enemies.getChildren());
  dazu('Kugeln', sp.bullets && sp.bullets.getChildren());
  dazu('Gegnerkugeln', sp.enemyBullets && sp.enemyBullets.getChildren());
  dazu('Aufsammler', sp.powerups && sp.powerups.getChildren());
  dazu('fx-Vorrat', sp.fxPool);
  dazu('Text-Vorrat', sp.txtPool);
  const zaehl = {};
  let aus = 0;
  for (const o of flach) {
    if (o.active === false) aus++;
    let wo = 'Rest';
    for (const [n, m] of mengen) if (m.has(o)) { wo = n; break; }
    const k = wo + (o.active === false ? ' (aus)' : '');
    zaehl[k] = (zaehl[k] || 0) + 1;
  }
  g.renderer.render = altR;
  return {
    schritte, sekunden: schritte * SCHRITT / 1000, dauer: Math.round(dauer),
    offen, trims: sp.poolTrims || 0, verlauf,
    liste: flach.length, aus, fxAktiv: sp.fxActive || 0, fxCap: sp.fxCap || 0,
    zaehl: Object.entries(zaehl).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`),
  };
}, { stage, sekunden });

console.log('\nSektor\n');
console.log('  RIG, kein Spiel: Zeichnen aus, Schleife von Hand getaktet, Spieler unverwundbar');
console.log('  und ohne Ausweichen. Es leben deshalb MEHR Gegner als im echten Spiel.');
console.log('  Bildzeiten sagt das hier NICHT — die Schrittweite ist gesetzt.\n');

let gemessen = 0;
for (const stage of [3, 106]) {
  const r = await lauf(stage, SEKUNDEN);
  if (r.fehler) { M.ungemessen(`Sektor ${stage}: ${r.fehler}`); continue; }
  gemessen++;
  const anteilOffen = r.offen / r.schritte * 100;
  console.log(`  Sektor ${String(stage).padStart(3)}   ${r.sekunden.toFixed(0)} s Spielzeit in ${r.dauer} ms Wanduhr`);
  console.log(`             Anzeigeliste ${r.liste}, davon abgeschaltet ${r.aus} (${(r.aus / r.liste * 100).toFixed(0)} %)   fx ${r.fxAktiv}/${r.fxCap}`);
  console.log(`             aufgeraeumt ${r.trims}x   ·   hoechstens zwei Gegner: ${anteilOffen.toFixed(1)} % der Bilder`);
  console.log(`             ${r.zaehl.join(' · ')}`);
  const p = r.verlauf.map((v) => v[1]);
  const d = Math.floor(p.length / 3);
  const mitte = p.slice(d, d * 2), ende = p.slice(d * 2);
  const mw = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);

  // A — laeuft der Sektor durch?
  if (r.schritte < Math.round(SEKUNDEN * 1000 / 16.7) * 0.9)
    M.befund(`Sektor ${stage} bleibt nach ${r.sekunden.toFixed(0)} von ${SEKUNDEN} s stehen — der Lauf misst dann das Ende, nicht den Sektor.`);

  // B — laeuft die Liste in eine Ebene?
  if (mitte.length >= 3 && ende.length >= 3) {
    const wachstum = mw(ende) / (mw(mitte) || 1);
    console.log(`             Anzeigeliste mittleres Drittel ${mw(mitte).toFixed(0)} → letztes ${mw(ende).toFixed(0)}  (${((wachstum - 1) * 100).toFixed(0)} %)`);
    if (wachstum > 1.15)
      M.befund(`Sektor ${stage}: die Anzeigeliste waechst noch im letzten Drittel (${mw(mitte).toFixed(0)} → ${mw(ende).toFixed(0)}, ${((wachstum - 1) * 100).toFixed(0)} %). Eine Liste, die nicht in eine Ebene laeuft, laeuft irgendwann ueber.`);
  } else M.ungemessen(`Sektor ${stage}: zu wenige Stichproben fuer den Verlauf.`);

  // C — wird auch im vollen Sektor aufgeraeumt? ANTEILIG an der Laufzeit,
  // nicht an einer gegriffenen Zahl: der Takt ist vier Sekunden, verlangt
  // wird die Haelfte davon.
  const soll = Math.floor(r.sekunden / 8);
  if (r.trims < soll)
    M.befund(`Sektor ${stage}: in ${r.sekunden.toFixed(0)} s wurde ${r.trims}x aufgeraeumt, erwartet mindestens ${soll}x. Haengt die Bedingung an der Gegnerzahl, ist sie genau dort zu, wo die Vorraete am groessten sind (hier nur ${anteilOffen.toFixed(1)} % der Bilder mit hoechstens zwei Gegnern).`);

  // D — wieviel Totes traegt die Liste mit?
  if (r.aus / r.liste > .45)
    M.befund(`Sektor ${stage}: ${(r.aus / r.liste * 100).toFixed(0)} % der Anzeigeliste sind abgeschaltete Objekte (${r.aus} von ${r.liste}). Sie kosten kein Zeichnen, aber jede Liste, die zur Haelfte aus Leichen besteht, wird bei jedem Durchgang mitgetragen.`);
  console.log('');
}

await browser.close();
server.close();
if (!gemessen) M.ungemessen('kein Sektor gemessen — es steht keine Zahl zur Verfuegung.');
M.urteil();

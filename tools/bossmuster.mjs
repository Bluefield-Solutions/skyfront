#!/usr/bin/env node
/*
  Bossmuster — feuert jede Phase anders, oder nur mehr vom Gleichen?

    node tools/bossmuster.mjs

  DER ANLASS: seit v32 lebt ein Boss zwanzig Sekunden statt drei. Solange
  er nach dem ersten Schuss tot war, fiel nicht auf, dass sich seine drei
  Phasen nur in ZAHL und TAKT unterschieden. Bei zwanzig Sekunden ist
  "mehr vom Gleichen" keine Phase mehr, sondern Warten.

  WIE GEMESSEN WIRD: das Spiel feuert selbst. `fireBoss()` wird sechsmal je
  Stufe und Phase aufgerufen, nur `spawnEB` faengt die Kugeln ab und zaehlt.
  Kein Muster wird hier nachgebaut (eiserne Regel 4). Sechs Aufrufe, weil
  ein Muster abwechseln darf — ein einzelner Aufruf saehe davon die Haelfte.

  DREI ZAHLEN JE STUFE UND PHASE:

    proSek      Kugeln je Sekunde: Schusszahl geteilt durch den Takt, den
                fireBoss selbst in nextFire schreibt.
    gezielt     Anteil der Kugeln, die innerhalb von 30 Grad auf den
                Spieler zeigen. Trennt "auf dich" von "um dich herum".
    Luecke      groesster Winkelabstand zwischen zwei benachbarten
                Schussrichtungen. Ein Ring hat eine kleine Luecke, ein
                Faecher eine von ueber 300 Grad. Das trennt "Flaeche" von
                "Buendel".

    Die SPANNE — der Winkelbereich — stand hier zuerst und war unbrauchbar:
    sie saettigt bei 180 Grad, sobald ein Ring dabei ist, und meldete
    deshalb fuer Stufe 2 und 3 durchweg 175 bis 180. Eine Messgroesse, die
    fuer alle Faelle dasselbe sagt, prueft nichts (eiserne Regel 13). Sie
    wird noch angezeigt, aber nicht mehr beurteilt.

  WAS VERLANGT WIRD:

    1. proSek steigt mit der Phase — innerhalb jeder Stufe.
    2. proSek steigt mit der Stufe — bei jeder Phase. Das fand die erste
       Messung als Befund: Stufe 3 feuerte weniger als Stufe 2.
    3. Zwischen Phase 1→2 und 2→3 aendert sich die ART, nicht nur die
       Zahl — messbar daran, dass sich gezielt ODER Luecke deutlich
       verschiebt.
    4. Nach oben gedeckelt: kein Muster ueber DECKEL Kugeln je Sekunde.

  WAS DAS NICHT SAGT: ob es sich gut anfuehlt, ob es fair ist, ob man
  ausweichen kann. Das sagt nur das Geraet.
*/
import { existsSync } from 'node:fs';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Bossmuster', 'jede Phase feuert anders, und die haertere Stufe feuert mehr.');

const AUFRUFE = 6;
const DECKEL = 32;          // Kugeln je Sekunde, Obergrenze
const ART_LUECKE = 60;      // Grad Unterschied in der groessten Luecke
const ART_GEZIELT = .2;     // oder dieser Unterschied im gezielten Anteil

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
if (!imSpiel) { await browser.close(); M.abbruch('kommt nicht ins Gefecht — ohne laufendes Spiel feuert kein Boss.'); }
await seite.waitForTimeout(1000);

const daten = await seite.evaluate(({ aufrufe, ohneNaht }) => {
  const g = window.__game.scene.getScene('Game');
  if (ohneNaht || typeof g.fireBoss !== 'function') return { fehler: 'fireBoss ist nicht zu erreichen' };
  const echtEB = g.spawnEB, echtFlash = g.muzzleFlash, echtBoss = g.boss, echtDuese = g.bossMuzzle;
  const merkFeuer = g.fireRateMul, merkExtra = g.bossExtraBullets, merkKap = g.kap2Boss, merkFinal = g.finalBoss;
  const aus = [];
  g.muzzleFlash = () => {};
  g.bossMuzzle = () => ({ x: 270, y: 185 });
  g.fireRateMul = 1; g.bossExtraBullets = 0; g.kap2Boss = false; g.finalBoss = false;
  const zielX = Math.atan2(700 - 185, 0);            // Spieler mittig unten
  for (const stufe of [1, 2, 3]) for (const phase of [1, 2, 3]) {
    const winkel = []; let takt = 0, fehler = null;
    const boss = { x: 270, y: 185, tier: stufe, phase: () => phase, nextFire: 0, nextAccent: 1e9, pattern: 0, enterDone: true };
    g.boss = boss;
    g.spawnEB = (x, y, vx, vy) => { winkel.push(Math.atan2(vy, vx)); };
    for (let i = 0; i < aufrufe; i++) {
      const jetzt = 1000 + i * 700;
      try { g.fireBoss(jetzt); } catch (e) { fehler = e.message; break; }
      takt += boss.nextFire - jetzt;
    }
    if (fehler) { aus.push({ stufe, phase, fehler }); continue; }
    const grad = winkel.map((w) => w * 180 / Math.PI);
    const zielGrad = zielX * 180 / Math.PI;
    const ab = (a) => { let d = Math.abs(a - zielGrad) % 360; return d > 180 ? 360 - d : d; };
    aus.push({
      stufe, phase,
      schuss: winkel.length / aufrufe,
      takt: takt / aufrufe,
      proSek: winkel.length * 1000 / takt,
      spanne: grad.length ? Math.max(...grad.map(ab)) - Math.min(...grad.map(ab)) : 0,
      luecke: (() => {
        if (grad.length < 2) return 360;
        const g = [...new Set(grad.map((a) => Math.round(((a % 360) + 360) % 360)))].sort((m, n) => m - n);
        let max = 360 - g[g.length - 1] + g[0];
        for (let i = 1; i < g.length; i++) max = Math.max(max, g[i] - g[i - 1]);
        return max;
      })(),
      gezielt: grad.filter((a) => ab(a) <= 30).length / Math.max(1, grad.length),
    });
  }
  g.spawnEB = echtEB; g.muzzleFlash = echtFlash; g.boss = echtBoss; g.bossMuzzle = echtDuese;
  g.fireRateMul = merkFeuer; g.bossExtraBullets = merkExtra; g.kap2Boss = merkKap; g.finalBoss = merkFinal;
  return { aus };
}, { aufrufe: AUFRUFE, ohneNaht: OHNE_NAHT });
await browser.close();

if (daten.fehler) M.abbruch(daten.fehler);
const z = daten.aus;
for (const e of z) if (e.fehler) M.ungemessen(`Stufe ${e.stufe} Phase ${e.phase}: ${e.fehler}`);
const gut = z.filter((e) => !e.fehler);
if (gut.length < 9) M.ungemessen(`nur ${gut.length} von 9 Mustern gemessen.`);

console.log(`Bossmuster — 3 Stufen x 3 Phasen, je ${AUFRUFE} Salven\n`);
console.log('  Stufe  Phase   Schuss    Takt   pro Sek   gezielt   Luecke   (Spanne)');
for (const e of gut)
  console.log(`  ${String(e.stufe).padStart(5)}  ${String(e.phase).padStart(5)}   ${e.schuss.toFixed(1).padStart(6)}  ${Math.round(e.takt).toString().padStart(5)} ms  ${e.proSek.toFixed(1).padStart(6)}   ${(e.gezielt * 100).toFixed(0).padStart(5)} %   ${Math.round(e.luecke).toString().padStart(4)}°   ${Math.round(e.spanne).toString().padStart(6)}°`);

const hol = (s, p) => gut.find((e) => e.stufe === s && e.phase === p);

// 1. Steigt der Druck mit der Phase?
for (const s of [1, 2, 3]) for (const p of [2, 3]) {
  const a = hol(s, p - 1), b = hol(s, p);
  if (a && b && b.proSek <= a.proSek)
    M.befund(`Stufe ${s}: Phase ${p} feuert nicht mehr als Phase ${p - 1} (${b.proSek.toFixed(1)} gegen ${a.proSek.toFixed(1)} je Sekunde).`);
}

// 2. Steigt der Druck mit der Stufe? Das war der erste Befund ueberhaupt.
for (const p of [1, 2, 3]) for (const s of [2, 3]) {
  const a = hol(s - 1, p), b = hol(s, p);
  if (a && b && b.proSek <= a.proSek)
    M.befund(`Phase ${p}: Stufe ${s} feuert nicht mehr als Stufe ${s - 1} (${b.proSek.toFixed(1)} gegen ${a.proSek.toFixed(1)} je Sekunde). Der haertere Boss ist der duennere Schuetze.`);
}

// 3. Wechselt die ART, oder nur die Zahl?
for (const s of [1, 2, 3]) for (const p of [2, 3]) {
  const a = hol(s, p - 1), b = hol(s, p);
  if (!a || !b) continue;
  const dL = Math.abs(b.luecke - a.luecke), dG = Math.abs(b.gezielt - a.gezielt);
  if (dL < ART_LUECKE && dG < ART_GEZIELT)
    M.befund(`Stufe ${s}, Phase ${p - 1} → ${p}: nur mehr vom Gleichen. Luecke ${Math.round(a.luecke)}° → ${Math.round(b.luecke)}°, gezielt ${(a.gezielt * 100).toFixed(0)} % → ${(b.gezielt * 100).toFixed(0)} %. Verlangt sind ${ART_LUECKE}° oder ${ART_GEZIELT * 100} Punkte Unterschied.`);
}

// 4. Deckel nach oben.
for (const e of gut) if (e.proSek > DECKEL)
  M.befund(`Stufe ${e.stufe} Phase ${e.phase}: ${e.proSek.toFixed(1)} Kugeln je Sekunde, Deckel ${DECKEL}.`);

M.urteil();

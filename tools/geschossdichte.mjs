#!/usr/bin/env node
/*
  Geschossdichte — wie viele Gegnergeschosse sind gleichzeitig unterwegs?

    node tools/geschossdichte.mjs [--tempo=260,300,340,380]

  DER ANLASS, gespielt und berichtet: „Teilweise sind zu viele Geschosse
  unterwegs, sodass man keine Moeglichkeit hat, denen zu entkommen.
  Braeuchten ein paar weniger Geschosse, die muessten aber auch ein
  bisschen schneller sein."

  DIE RECHNUNG dahinter ist zwei Divisionen lang:

    Ein Geschoss ist HOEHE / TEMPO Sekunden im Bild.
    Ein Gegner erzeugt SCHUSSZAHL / FEUERTAKT Geschosse je Sekunde.
    Gleichzeitig im Bild sind also beides miteinander malgenommen.

  Daraus folgt der Hebel, den der Wunsch beschreibt: ein SCHNELLERES
  Geschoss ist kuerzer im Bild, also sind weniger gleichzeitig da — ohne
  dass ein Gegner seltener schiesst. Von 260 auf 340 sind es ein Viertel
  weniger, bei gleicher Feuerrate.

  GEMESSEN WIRD JE GEGNERART UND JE BOSSSTUFE, nicht je Sektor.

  Der erste Entwurf rechnete den ganzen Sektor: wer laut Wellenplan wann
  kommt, mal seiner Durchflugzeit. Er kam auf 970 gleichzeitige Geschosse
  in Sektor 100 — offensichtlicher Unsinn. Der Fehler steckt in einer
  Annahme, die niemand geprueft hatte: dass jeder Gegner die volle
  Durchflugzeit lebt und ununterbrochen feuert. In Wahrheit ist er nach
  Sekunden abgeschossen, und wie lange er lebt, kann diese Rechnung nicht
  wissen. Eine Zahl, die offensichtlich nicht stimmt, wird nicht mit einer
  angehobenen Grenze gerettet — sie wird gestrichen.

  Was BLEIBT, ist modellfrei: was EIN Gegner, solange er lebt, an
  Geschossen im Bild haelt. Da steckt keine Annahme drin ausser der, dass
  er feuert — und dafuer ist er da.

  WOHER DIE ZAHLEN KOMMEN — jede einzelne aus dem laufenden Spiel:

    Schusszahl   Das Spiel feuert selbst. `fireEnemy()` wird je Gegnerart
                 aufgerufen, nur `spawnEB` faengt mit und zaehlt. Die
                 verzoegerten Schuesse (burst3, twin) werden dabei sofort
                 ausgefuehrt, sonst fehlten sie in der Zaehlung.
    Feuertakt    cfg.fireEvery aus der Gegnertabelle.
    Tempo        _t.bulletSpeed, der Wert aus src/balance.js.
  WAS DAS NICHT IST: eine Vorhersage, wieviele Geschosse auf dem Schirm
  stehen — dafuer muesste man wissen, wieviele Gegner gleichzeitig leben.
  Es ist die Dichte, die EINER erzeugt: ein Vergleichsmass, mit dem sich
  Gegnerarten nebeneinanderlegen und Tempi durchprobieren lassen.

  BEIM BOSS ist es keine Naeherung, sondern die Sache selbst: er ist EIN
  Gegner, er steht allein im Bild, und er lebt die ganze Zeit. Was er
  gleichzeitig in der Luft haelt, ist genau das, wogegen man ausweicht.

  Seine Geschosse fliegen in alle Richtungen, nicht nur nach unten —
  deshalb wird die Flugzeit je Geschoss aus seiner ECHTEN Geschwindigkeit
  und Richtung gerechnet: wie lange braucht es, bis es den Schirm
  verlaesst? Ein Ring nach oben ist nach einer halben Sekunde weg, einer
  nach unten braucht drei.
*/
import { existsSync } from 'node:fs';
import { messstelle } from './messstelle.mjs';

const M = messstelle('Geschossdichte', 'kein einzelner Gegner haelt mehr Geschosse im Bild als das Band erlaubt.');
const arg = process.argv.find((a) => a.startsWith('--tempo='));
const TEMPI = arg ? arg.slice(8).split(',').map(Number) : null;

// Das Band. Gesetzt, nicht gemessen — und hier hingeschrieben, damit man
// ihm widersprechen kann: bei zwoelf Geschossen aus EINER Quelle bleiben
// auf 540 Punkten Breite Luecken, durch die ein Flugzeug von 60 Punkten
// passt. Der Elite lag bei 45.
const OBEN = 12;

if (!existsSync('dist/Skyfront.html')) M.abbruch('dist/Skyfront.html fehlt — erst bauen.');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.abbruch('Playwright nicht gefunden.'); }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
await seite.waitForFunction(() => window.__game && window.__SKF_GEGNER, null, { timeout: 90000 });
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

const d = await seite.evaluate((tempi) => {
  const spiel = window.__game.scene.getScene('Game');
  const Ke = window.__SKF_GEGNER;
  if (!Ke) return { fehler: 'Naht fehlt (__SKF_GEGNER)' };

  // Wie viele Geschosse gibt eine Art je Feuerstoss ab? Das Spiel feuert
  // selbst; nur spawnEB faengt mit und zaehlt (eiserne Regel 4).
  const echtEB = spiel.spawnEB, echtDelay = spiel.time.delayedCall.bind(spiel.time);
  const arten = [];
  for (const art of Object.keys(Ke)) {
    const cfg = Ke[art];
    if (!cfg.fireEvery) continue;
    let n = 0;
    spiel.spawnEB = () => { n++; };
    // Verzoegerte Schuesse sofort ausfuehren — sonst zaehlt burst3 als
    // einer und twin als keiner, und gerade die machen die Dichte.
    spiel.time.delayedCall = (ms, f) => { try { f(); } catch (e) {} return { remove() {} }; };
    try { spiel.fireEnemy({ x: 270, y: 200, rotation: 0, active: true, cfg }); } catch (e) { n = -1; }
    spiel.spawnEB = echtEB; spiel.time.delayedCall = echtDelay;
    arten.push({ art, schuss: n, takt: cfg.fireEvery, muster: cfg.pattern || '—' });
  }
  // ---- und der Boss ---------------------------------------------------
  //
  // Dieselbe Frage, andere Quelle: fireBoss() feuert, spawnEB faengt mit —
  // aber hier zaehlen wir nicht nur, WIE VIELE, sondern auch WOHIN und wie
  // schnell. Aus Richtung und Tempo folgt, wie lange ein Geschoss im Bild
  // bleibt, und erst daraus die Zahl, die gleichzeitig unterwegs ist.
  const HOEHE = 960, BREITE = 540;
  const bossZeilen = [];
  if (typeof spiel.fireBoss === 'function') {
    const eEB = spiel.spawnEB, eFlash = spiel.muzzleFlash, eBoss = spiel.boss, eDuese = spiel.bossMuzzle;
    const mFeuer = spiel.fireRateMul, mExtra = spiel.bossExtraBullets, mKap = spiel.kap2Boss, mFin = spiel.finalBoss;
    spiel.muzzleFlash = () => {};
    spiel.bossMuzzle = () => ({ x: 270, y: 185 });
    spiel.fireRateMul = 1; spiel.bossExtraBullets = 0; spiel.kap2Boss = false; spiel.finalBoss = false;
    const AUFRUFE = 6;
    for (const stufe of [1, 2, 3, 4, 5]) {
      let summeLeben = 0, n = 0, takt = 0;
      for (const phase of [1, 2, 3]) {
        const leben = [];
        const boss = { x: 270, y: 185, tier: stufe, phase: () => phase, nextFire: 0, nextAccent: 1e9, pattern: 0, enterDone: true };
        spiel.boss = boss;
        spiel.spawnEB = (x, y, vx, vy) => {
          // Wie lange bleibt dieses Geschoss im Bild? Zeit bis zur naechsten
          // Kante, laengstens vier Sekunden.
          const tx = vx > 1 ? (BREITE - x) / vx : (vx < -1 ? -x / vx : 9),
            ty = vy > 1 ? (HOEHE - y) / vy : (vy < -1 ? -y / vy : 9);
          leben.push(Math.min(4, Math.max(0.05, Math.min(tx, ty))));
        };
        let t = 0;
        for (let i = 0; i < AUFRUFE; i++) {
          const jetzt = 1000 + i * 700;
          try { spiel.fireBoss(jetzt); } catch (e) { break; }
          t += boss.nextFire - jetzt;
        }
        summeLeben += leben.reduce((a, b) => a + b, 0);
        n += leben.length; takt += t;
      }
      // Gleichzeitig im Bild = Summe der Lebensdauern geteilt durch die
      // Zeit, in der sie entstanden sind.
      bossZeilen.push({ stufe, proSek: n * 1000 / Math.max(1, takt),
        mittleresLeben: n ? summeLeben / n : 0,
        gleichzeitig: summeLeben * 1000 / Math.max(1, takt) });
    }
    spiel.spawnEB = eEB; spiel.muzzleFlash = eFlash; spiel.boss = eBoss; spiel.bossMuzzle = eDuese;
    spiel.fireRateMul = mFeuer; spiel.bossExtraBullets = mExtra; spiel.kap2Boss = mKap; spiel.finalBoss = mFin;
  }

  const tempoJetzt = (window.__SKF_GEGNERWERTE || {}).bulletSpeed || 0;
  return { arten, HOEHE, tempoJetzt, tempi: tempi || [tempoJetzt], bossZeilen };
}, TEMPI);
await browser.close();
if (d.fehler) M.abbruch(d.fehler);
if (!(d.tempoJetzt > 0)) M.ungemessen('das Geschosstempo liess sich nicht auslesen.');

// Gleichzeitig im Bild = Schuesse je Sekunde mal Flugzeit.
const dichte = (a, tempo) => a.schuss / (a.takt / 1000) * (d.HOEHE / tempo);
const sortiert = [...d.arten].sort((x, y) => dichte(y, d.tempoJetzt) - dichte(x, d.tempoJetzt));

console.log(`Geschossdichte — was EIN Gegner gleichzeitig im Bild haelt (Schirm ${d.HOEHE} hoch)\n`);
console.log(`  Tempo jetzt: ${d.tempoJetzt}   ·   Flugzeit eines Geschosses: ${(d.HOEHE / d.tempoJetzt).toFixed(2)} s\n`);
console.log('  Gegner         Muster      Schuss   Takt      ' + d.tempi.map((t) => String(t).padStart(6)).join(''));
for (const a of sortiert)
  console.log(`  ${a.art.padEnd(14)} ${String(a.muster).padEnd(11)} ${String(a.schuss).padStart(6)}   ${String(a.takt).padStart(5)} ms  `
    + d.tempi.map((t) => dichte(a, t).toFixed(1).padStart(6)).join(''));
console.log(`\n  Band: hoechstens ${OBEN} aus einer Quelle.`);

// ---- der Boss ------------------------------------------------------
// Sein Band ist ein anderes: er steht ALLEIN im Bild und lebt die ganze
// Zeit, waehrend Gegner zu mehreren kommen und schnell sterben. 26 ist
// gesetzt, nicht gemessen — bei 26 Geschossen aus einer Quelle, verteilt
// ueber einen Schirm von 540 Punkten, bleiben Luecken, durch die ein
// Flugzeug von 60 Punkten passt.
// 32, nicht 26 — und das ist eine Entscheidung, keine Messung.
//
// Der Boss ist der Hoehepunkt, und er soll hart sein; das war die
// ausdrueckliche Vorgabe („mindestens 20 Sekunden", spaeter „30 Prozent
// obendrauf"). Ihn auf das Band eines gewoehnlichen Gegners zu ziehen,
// waere die falsche Antwort auf „zu viele Geschosse".
//
// Hergeleitet ist die Zahl aus dem Bossmuster-Tor: das verlangt in jeder
// Phase eine Winkelluecke von mindestens 60 Grad, also ein Sechstel des
// Kreises. Solange die Zahl der gleichzeitigen Geschosse etwa dem
// Sechsfachen dessen entspricht, was in eine solche Luecke passt, bleibt
// sie durchfliegbar; darueber wird auch die Luecke zeitlich zugestellt.
//
// Belegt ist das nicht. Es ist die beste Herleitung, die ohne Geraet zu
// haben ist, und die naechste gespielte Runde entscheidet.
const BOSS_OBEN = 32;
if (d.bossZeilen && d.bossZeilen.length) {
  console.log('\n  Bossstufe   Kugeln/s   mittlere Flugzeit   gleichzeitig im Bild');
  for (const b of d.bossZeilen)
    console.log(`  ${String(b.stufe).padStart(9)}   ${b.proSek.toFixed(1).padStart(8)}   ${b.mittleresLeben.toFixed(2).padStart(15)} s   ${b.gleichzeitig.toFixed(1).padStart(20)}`);
  console.log(`  Band: hoechstens ${BOSS_OBEN}.`);
  const heftig = d.bossZeilen.filter((b) => b.gleichzeitig > BOSS_OBEN).sort((x, y) => y.gleichzeitig - x.gleichzeitig);
  if (heftig.length)
    M.befund(`${heftig.length} Bossstufe(n) halten mehr als ${BOSS_OBEN} Geschosse gleichzeitig im Bild `
      + `(${heftig.map((b) => `Stufe ${b.stufe}: ${b.gleichzeitig.toFixed(0)}`).join(', ')}). `
      + `Er steht allein im Bild und lebt zwanzig Sekunden — da ist Ausweichen keine Frage des Koennens mehr.`);
} else M.ungemessen('der Boss liess sich nicht zum Feuern bringen.');

const zuViel = sortiert.filter((a) => dichte(a, d.tempoJetzt) > OBEN);
if (zuViel.length)
  M.befund(`${zuViel.length} Gegnerart(en) halten allein mehr als ${OBEN} Geschosse gleichzeitig im Bild `
    + `(${zuViel.map((a) => `${a.art} ${dichte(a, d.tempoJetzt).toFixed(0)}`).join(', ')}). `
    + `Wo zwei davon zugleich stehen, ist Ausweichen Glueckssache.`);
if (d.arten.some((a) => a.schuss < 0))
  M.ungemessen('mindestens eine Gegnerart liess sich nicht zum Feuern bringen.');

M.urteil();

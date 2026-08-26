#!/usr/bin/env node
/*
  Zeitachse — wie lange dauert ein Sektor?

    node tools/zeitachse.mjs [--tafel]

  DER ANLASS: „die Level sind zu kurz, sie sollten eher 60 bis 90 Sekunden
  gehen." Das war eine Absicht, keine Zahl. Ohne Messung laesst sich weder
  sagen, ob es stimmt, noch, ob eine Aenderung etwas bewirkt hat.

  WAS GEMESSEN WIRD — und woher jede Zahl kommt:

    Wellenfenster   Vom ersten bis zum letzten Wellenstart eines Sektors.
                    Kommt aus dem Wellenplan des Spiels (window.__SKF_STUFEN,
                    Feld `at` in Millisekunden), nicht aus einer nachgebauten
                    Formel.

    Bosszeit        Lebenspunkte geteilt durch Schaden je Sekunde.
                    Die Lebenspunkte rechnet dieselbe Funktion, die das Spiel
                    benutzt (window.__SKF_BOSSLEBEN) — nicht diese Datei.
                    Die Salve zaehlt das Spiel selbst: `fire()` wird
                    aufgerufen, nur `shootBullet` faengt mit und zaehlt. Auch
                    hier wird keine Formel nachgebaut (eiserne Regel 4).

    Sektor          Wellenfenster + Bosszeit.

  WAS DAS NICHT IST: die tatsaechliche Spielzeit. Es ist eine UNTERGRENZE.
  Nicht enthalten sind das Leerraeumen nach der letzten Welle, jeder
  Fehlschuss, jede Sekunde Ausweichen und der Einflug des Bosses. Die
  wirkliche Runde dauert laenger — wieviel laenger, sagt nur das Geraet.
  Deshalb ist das Band auf die UNTERGRENZE gesetzt: was hier zu kurz ist,
  ist auf dem Telefon erst recht nicht lang genug.

  Angenommen wird ausserdem: volle Feuerkraft, jeder Schuss trifft, keine
  Panzerung. Dieselbe Annahme wie in tools/feuerkraft.mjs.
*/
import { existsSync } from 'node:fs';
import { messstelle, OHNE_NAHT } from './messstelle.mjs';

const M = messstelle('Zeitachse', 'jeder Sektor traegt mindestens das untere Band.');
const TAFEL = process.argv.includes('--tafel');

// Das Band. Die Untergrenze kommt aus dem Ziel („mindestens 60 bis 90 s"),
// die Obergrenze aus dem Gegenteil: ein Sektor, der auch als Untergrenze
// ueber zwei Minuten laeuft, ist auf dem Telefon keine Runde mehr, sondern
// eine Sitzung.
const UNTEN = 60, OBEN = 130;

if (!existsSync('dist/Skyfront.html')) M.abbruch('dist/Skyfront.html fehlt — erst bauen.');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.abbruch('Playwright nicht gefunden.'); }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
await seite.waitForFunction(() => window.__game && window.__SKF_STUFEN, null, { timeout: 90000 });
await seite.waitForTimeout(1200);

if (OHNE_NAHT) await seite.evaluate(() => { delete window.__SKF_BOSSLEBEN; });

// Ins Gefecht — nur dort stehen die echten Kampfwerte. Im Menue ist
// playerBulletDamage noch der nackte Anfangswert.
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
if (!imSpiel) { await browser.close(); M.abbruch('kommt nicht ins Gefecht — ohne laufendes Spiel gibt es keine Kampfwerte.'); }
await seite.waitForTimeout(1200);

const daten = await seite.evaluate(() => {
  const spiel = window.__game.scene.getScene('Game');
  const stufen = window.__SKF_STUFEN, kapitel = window.__SKF_KAPITEL, leben = window.__SKF_BOSSLEBEN;
  if (!stufen || !kapitel || !leben) return { fehler: 'Naht fehlt (__SKF_STUFEN / __SKF_KAPITEL / __SKF_BOSSLEBEN)' };

  // Die Salve zaehlt das Spiel. Wir haengen uns nur an den Abschuss.
  const echtSchuss = spiel.shootBullet, echtZweit = spiel.fireSecondary, echtSpieler = spiel.player;
  let n = 0;
  spiel.shootBullet = () => { n++; };
  spiel.fireSecondary = () => { n++; };
  spiel.player = { x: 270, y: 700, powerLevel: spiel.player ? spiel.player.powerLevel : 1 };
  const volleStufe = 10;
  spiel.player.powerLevel = volleStufe;
  try { spiel.fire(); } catch (e) { n = -1; }
  spiel.shootBullet = echtSchuss; spiel.fireSecondary = echtZweit; spiel.player = echtSpieler;

  return {
    salve: n, schaden: spiel.playerBulletDamage, takt: spiel.fireDelay,
    waffe: spiel.weapon, bossDmgMul: spiel.bossDmgMul, hpMul: spiel.enemyHpMul,
    sektoren: stufen.map((s, i) => {
      const st = i + 1, w = s.waves || [], at = w.map((x) => x.at || 0);
      return {
        nr: st, label: s.label, wellen: w.length, stufe: s.boss,
        fenster: w.length ? (Math.max(...at) - Math.min(...at)) / 1000 : 0,
        bossHp: s.boss > 0 ? leben(s.boss, st, spiel.enemyHpMul, false, 0) : 0,
      };
    }),
  };
});
await browser.close();

if (daten.fehler) M.abbruch(daten.fehler);
if (!(daten.salve > 0)) M.ungemessen('die Salve liess sich nicht zaehlen — ohne sie keine Bosszeit.');
if (!(daten.schaden > 0) || !(daten.takt > 0)) M.ungemessen('Schaden oder Feuertakt fehlen.');

const dps = daten.salve > 0 && daten.schaden > 0 && daten.takt > 0
  ? daten.salve * daten.schaden * (daten.bossDmgMul || 1) * 1000 / daten.takt : 0;

console.log(`Zeitachse — ${daten.sektoren.length} Sektoren\n`);
console.log(`  Waffe ${daten.waffe}, volle Stufe: ${daten.salve} Schuss je Salve, `
  + `${daten.schaden} Schaden, alle ${daten.takt} ms  →  ${Math.round(dps)} Schaden/s am Boss`);
console.log('  (volle Feuerkraft, jeder Schuss trifft — Untergrenze, keine Spielzeit)\n');

const zeilen = [];
for (const s of daten.sektoren) {
  const boss = dps > 0 && s.bossHp > 0 ? s.bossHp / dps : 0;
  zeilen.push({ ...s, boss, gesamt: s.fenster + boss });
}

const zeig = TAFEL ? zeilen : zeilen.filter((z) => [1, 2, 3, 5, 10, 15, 20, 30, 40, 60, 80, 100, 120].includes(z.nr));
console.log('  Sektor  Ort                Wellen  Fenster   Boss-HP  Bosszeit   Sektor');
for (const z of zeig)
  console.log(`  ${String(z.nr).padStart(6)}  ${z.label.slice(0, 17).padEnd(17)} ${String(z.wellen).padStart(6)}  `
    + `${z.fenster.toFixed(1).padStart(6)} s  ${String(z.bossHp).padStart(7)}  ${z.boss.toFixed(1).padStart(6)} s  `
    + `${z.gesamt.toFixed(1).padStart(6)} s`);

const kurz = zeilen.filter((z) => z.gesamt < UNTEN);
const lang = zeilen.filter((z) => z.gesamt > OBEN);
const g = zeilen.map((z) => z.gesamt).sort((a, b) => a - b);
console.log(`\n  Untergrenze gesamt: kuerzester ${g[0].toFixed(1)} s, Median ${g[Math.floor(g.length / 2)].toFixed(1)} s, laengster ${g[g.length - 1].toFixed(1)} s`);

if (kurz.length)
  M.befund(`${kurz.length} Sektor(en) bleiben unter ${UNTEN} s, kuerzester ${kurz[0].label} mit ${kurz[0].gesamt.toFixed(1)} s `
    + `(Sektor ${kurz.map((z) => z.nr).slice(0, 12).join(', ')}${kurz.length > 12 ? ' …' : ''}).`);
if (lang.length)
  M.befund(`${lang.length} Sektor(en) liegen ueber ${OBEN} s, laengster ${lang[lang.length - 1].label} mit ${lang[lang.length - 1].gesamt.toFixed(1)} s.`);

// Waechst der Boss ueberhaupt mit? Ohne diese Frage misst die Tafel die
// Laenge und uebersieht, dass die Schwierigkeit stehenbleibt.
const jeStufe = {};
for (const z of zeilen) if (z.stufe > 0) (jeStufe[z.stufe] ||= []).push(z);
for (const [st, liste] of Object.entries(jeStufe)) {
  const erst = liste[0], letzt = liste[liste.length - 1];
  const zuwachs = letzt.bossHp / erst.bossHp;
  console.log(`  Boss Stufe ${st}: Sektor ${erst.nr} ${erst.bossHp} HP → Sektor ${letzt.nr} ${letzt.bossHp} HP  (${zuwachs.toFixed(2)}x)`);
  if (zuwachs < 1.5)
    M.befund(`Boss Stufe ${st} waechst ueber die ganze Kampagne nur um das ${zuwachs.toFixed(2)}-fache `
      + `(Sektor ${erst.nr}: ${erst.bossHp} HP, Sektor ${letzt.nr}: ${letzt.bossHp} HP). Die Feuerkraft des Spielers waechst um mehr.`);
}

M.urteil();

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
// --json: nur die Zeilen, maschinenlesbar. Dafuer da, dass ein Eichlauf
// (tools/fenstereichen.mjs) mit DEMSELBEN Werkzeug misst wie das Tor und
// nicht mit einer zweiten, nachgebauten Rechnung (eiserne Regel 4).
const JSON_AUS = process.argv.includes('--json');
// Bei --json schweigt die Tafel: sonst stuende vor dem JSON die halbe
// Ausgabe, und der Eichlauf muesste raten, wo sie aufhoert.
const AUSGABE = console.log;
if (JSON_AUS) console.log = () => {};

// Das Band. Die Untergrenze kommt aus dem Ziel („mindestens 60 bis 90 s").
//
// Die Obergrenze stand zuerst bei 130 s. Sie war meine Zahl, nicht die des
// Ziels, und sie war zu eng: als der Boss von drei auf zwanzig Sekunden
// wuchs — genau das war verlangt —, schlug sie an, obwohl nichts falsch
// war. Der genannte Massstab ist 1945 Air Force, und dort laeuft ein
// spaeter Abschnitt samt Boss zwei bis drei Minuten.
//
// 160 s ist deshalb aus dem Massstab genommen, nicht aus dem Ergebnis:
// Wellen (bis 96 s gemessen) plus ein Boss, der als UNTERgrenze bis 45 s
// haelt. Wer sie weiter aufmacht, sollte denselben Satz schreiben koennen.
const UNTEN = 60, OBEN = 160;

// Und ein Deckel auf das WELLENFENSTER allein — den Teil vor dem Boss.
//
// Die 90 s sind nicht meine Zahl: „die Level sollten eher 60 bis 90
// Sekunden gehen." Wenn schon der Wellenteil darueber liegt, ist der
// Sektor an der Vorgabe vorbei, bevor der Boss ueberhaupt einfliegt — und
// unter der Obergrenze von 160 s bleibt fuer ihn nur noch, was uebrig ist.
// Genau daran sind in v39 die Bossstufen 4 und 5 gescheitert: 95,7 s
// Fenster im letzten Sektor liessen 64 s fuer den Boss, also Stufe 3.
const FENSTER_OBEN = 90;

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

  const letzter = stufen.length;
  return {
    bild4: window.__game.textures.exists('boss4'), bild5: window.__game.textures.exists('boss5'),
    salve: n, schaden: spiel.playerBulletDamage, takt: spiel.fireDelay,
    kapitel: kapitel.map((k) => ({ name: k.name, roman: k.roman, start: k.start, count: k.count })),
    // Das Modell fuer sich: DIESELBE Stufe im ersten und im letzten Sektor.
    // Ohne Zuordnung, damit die Frage "waechst der Boss?" nicht davon
    // abhaengt, wo die Stufenliste ihn gerade hinstellt (eiserne Regel 4).
    modell: [1, 2, 3, 4, 5].map((st) => ({
      stufe: st, erst: leben(st, 1, spiel.enemyHpMul, false, 0), letzt: leben(st, letzter, spiel.enemyHpMul, false, 0),
    })),
    letzter,
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

if (JSON_AUS) {
  AUSGABE(JSON.stringify({ dps, modell: daten.modell, zeilen: zeilen.map((z) => ({ nr: z.nr, stufe: z.stufe, wellen: z.wellen, fenster: z.fenster, bossHp: z.bossHp, boss: z.boss, gesamt: z.gesamt })) }));
  process.exit(0);
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
const weit = zeilen.filter((z) => z.fenster > FENSTER_OBEN);
if (weit.length)
  M.befund(`${weit.length} Sektor(en) haben ein Wellenfenster ueber ${FENSTER_OBEN} s, laengstes `
    + `${weit[weit.length - 1].label} mit ${weit[weit.length - 1].fenster.toFixed(1)} s. `
    + `Der Wellenteil allein liegt damit ueber der Vorgabe, und fuer den Boss bleibt zu wenig Platz unter ${OBEN} s.`);
if (lang.length)
  M.befund(`${lang.length} Sektor(en) liegen ueber ${OBEN} s, laengster ${lang[lang.length - 1].label} mit ${lang[lang.length - 1].gesamt.toFixed(1)} s.`);

// Vergibt die Stufenliste Bosse, fuer die es gar kein Bild gibt?
//
// Die Stufen 4 und 5 sind seit v38 gerechnet und feuern eigene Muster, aber
// ihre Bilder (Ringfestung, Ambosskreuzer) sind bestellt und nicht
// geliefert. Wer sie in der Stufenliste vergibt, bevor die Bilder da sind,
// bekommt drei Bosse, die gleich AUSSEHEN und verschieden schiessen — und
// merkt es erst auf dem Geraet. Diese Pruefung merkt es vorher.
{
  const ohne = zeilen.filter((z) => (z.stufe === 4 && !daten.bild4) || (z.stufe === 5 && !daten.bild5));
  if (ohne.length)
    M.befund(`${ohne.length} Sektor(en) vergeben Bossstufe 4 oder 5, aber die Textur dafuer fehlt `
      + `(Sektor ${ohne.map((z) => z.nr).slice(0, 8).join(', ')}${ohne.length > 8 ? ' …' : ''}). `
      + `Der Boss faellt dann auf das Bild der Stufe 3 zurueck: gleiches Aussehen, anderes Feuer. Erst npm run einbau.`);
}

// Waechst der Boss ueberhaupt mit? Ohne diese Frage misst die Tafel die
// Laenge und uebersieht, dass die Schwierigkeit stehenbleibt.
//
// Gemessen wird am MODELL, nicht an der Zuordnung: dieselbe Stufe im ersten
// und im letzten Sektor. Vorher stand hier der erste und der letzte Sektor,
// dem diese Stufe ZUGETEILT ist — das mass zwei Dinge auf einmal. Sobald
// Stufe 1 nur noch in den ersten Kapiteln vorkommt (v39), faellt ihre
// Spanne, ohne dass am Boss etwas flacher geworden waere: ein Befund, der
// die Zuordnung meldet und den Boss meint (eiserne Regel 4).
for (const m of daten.modell) {
  if (!(m.erst > 0)) continue;
  const zuwachs = m.letzt / m.erst;
  if (daten.sektoren.some((s) => s.stufe === m.stufe))
    console.log(`  Boss Stufe ${m.stufe}: Sektor 1 ${m.erst} HP → Sektor ${daten.letzter} ${m.letzt} HP  (${zuwachs.toFixed(2)}x)`);
  if (zuwachs < 1.5)
    M.befund(`Boss Stufe ${m.stufe} waechst ueber die ganze Kampagne nur um das ${zuwachs.toFixed(2)}-fache `
      + `(Sektor 1: ${m.erst} HP, Sektor ${daten.letzter}: ${m.letzt} HP). Die Feuerkraft des Spielers waechst um mehr.`);
}

// Und steigt die ZUORDNUNG mit? Das ist die andere Haelfte: der Boss kann
// mitwachsen und die Kampagne trotzdem stehenbleiben, wenn jedes Kapitel
// dieselben Stufen vergibt.
//
// Beim ersten Lauf dieser Pruefung (v39) war genau das der Fall: die
// Kapitel VII bis XI trugen FUENF MAL dieselbe Reihe 1,2,2,2,3,1,3,2,1,3 —
// fuenfzig Sektoren ohne eine einzige Aenderung. Kein Tor hatte das je
// gesehen, weil alle nur auf die Laenge und auf die Bosswerte schauten.
{
  const kap = daten.kapitel.map((k) => {
    const s = daten.sektoren.filter((z) => z.nr >= k.start && z.nr < k.start + k.count);
    return { ...k, reihe: s.map((z) => z.stufe), mittel: s.reduce((a, z) => a + z.stufe, 0) / (s.length || 1) };
  });
  console.log('\n  Kapitel   mittlere Bossstufe   Reihe');
  for (const k of kap)
    console.log(`  ${k.roman.padEnd(6)} ${k.mittel.toFixed(2).padStart(12)}         ${k.reihe.join(' ')}`);

  const faellt = kap.filter((k, i) => i > 0 && k.mittel < kap[i - 1].mittel - 1e-9);
  if (faellt.length)
    M.befund(`${faellt.length} Kapitel vergeben im Mittel SCHWAECHERE Bosse als das Kapitel davor `
      + `(${faellt.map((k) => `${k.roman} ${k.mittel.toFixed(2)}`).join(', ')}). Die Kampagne faellt zurueck.`);

  const gleich = kap.filter((k, i) => i > 0 && k.reihe.join() === kap[i - 1].reihe.join());
  if (gleich.length)
    M.befund(`${gleich.length} Kapitel wiederholen die Bossreihe des vorigen Kapitels Zeichen fuer Zeichen `
      + `(${gleich.map((k) => k.roman).join(', ')}). Wer sie spielt, spielt dasselbe Kapitel noch einmal.`);

  const anstieg = kap[kap.length - 1].mittel - kap[0].mittel;
  console.log(`  Anstieg ueber die Kampagne: ${kap[0].mittel.toFixed(2)} → ${kap[kap.length - 1].mittel.toFixed(2)}  (+${anstieg.toFixed(2)} Stufen)`);
}

M.urteil();

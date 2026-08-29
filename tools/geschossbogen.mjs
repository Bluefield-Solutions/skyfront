#!/usr/bin/env node
/*
  Geschossbogen — alle Gegnergeschosse nebeneinander, gross, auf hellem
  UND dunklem Grund.

    node tools/geschossbogen.mjs [--was=geschosse|gegner|alle] [--datei=…]

  WOZU: „Kein Tor ersetzt den Blick." Der Farbtor zaehlt Bildpunkte und
  sagt, ob eine Kugel ihr eigenes Signal traegt (Anteil warmer, satter
  Flaeche). Er sagt NICHT, ob man sie erkennt, ob zwei Arten sich gleichen
  oder ob eine Form auf 30 Bildpunkten zu Brei wird.

  ZWEI BOEGEN. Der erste zeigt die Geschosse, der zweite die Gegner und
  Bosse — in ANZEIGEGROESSE, also Textur mal Spielskala, damit ein
  Spaeher neben einem Traeger so klein steht wie im Spiel.

  Der zweite Bogen kam dazu, weil der erste beim ersten Ansehen einen
  Fehler fand, der fuenf Versionen alt war (SKY-246). Dieselben Texturen
  hatten vierzehn Tore passiert. Was fuer die Kugeln galt, gilt fuer die
  Gegner auch: nebeneinandergelegt hat sie nie jemand.

  GEMESSEN WIRD NUR AUF DEM GESCHOSSBOGEN: die Eckdeckung. Ein Hof, der
  nicht ins Bild passt, wird am Rand abgeschnitten und steht als dunkles
  Rechteck um die Kugel.

  AUF DEM GEGNERBOGEN WIRD NICHTS BEWERTET, und das ist Absicht. Der erste
  Entwurf mass dort den „Anschnitt": Deckkraft auf den vier Randlinien der
  Textur. Er meldete 13 von 13 Gegnern als angeschnitten — und auf dem Bogen
  hat jedes Schiff ringsum reichlich Luft. Die Zahl war falsch, nicht die
  Bilder: im Gefecht werden die Gegner in Anzeigeaufloesung NEU gebacken,
  und was `getSourceImage()` dann liefert, ist nicht die Textur, gegen die
  ich gerechnet hatte. Ein Befund, den das Bild widerlegt, wird nicht
  gemeldet, sondern zurueckgezogen.

  Also traegt dieser Bogen die Groessen, die das SPIEL nennt: jeder Gegner
  wird gespawnt und nach displayWidth/displayHeight gefragt. Geprueft wird
  nur die Vollstaendigkeit — ob alle da sind. Den Rest sieht man.

  DIE MESSSTELLE: die Texturen aus dem GEBAUTEN Spiel, links auf #10151c
  (Nachthimmel), rechts auf #d8d2c4 (Wueste). Das sind die zwei Faelle, in
  denen etwas verschwinden kann: heller Kern auf hellem Grund, dunkler
  Rand auf dunklem. Gezeigt wird jede Textur auf BEIDEN Gruenden — der
  erste Entwurf legte einen Halbgrund unter EIN Raster, dann stand die
  mittlere Spalte auf der Kante.

  Vergroessert wird mit abgeschalteter Glaettung — was hier weich aussieht,
  ist weich gezeichnet und nicht hochskaliert.
*/
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { messstelle } from './messstelle.mjs';

const M = messstelle('Bildbogen', 'Geschosse und Gegner liegen gross nebeneinander, auf beiden Gruenden.');
const argD = process.argv.find((a) => a.startsWith('--datei='));
const argW = process.argv.find((a) => a.startsWith('--was='));
const WAS = argW ? argW.slice(6) : 'alle';
if (!['geschosse', 'gegner', 'alle'].includes(WAS)) M.abbruch(`--was=${WAS} kenne ich nicht.`);

if (!existsSync('dist/Skyfront.html')) M.abbruch('dist/Skyfront.html fehlt — erst bauen.');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { M.abbruch('Playwright nicht gefunden.'); }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const seite = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
await seite.goto('file://' + process.cwd() + '/dist/Skyfront.html');
await seite.waitForFunction(() => window.__game && window.__game.textures.exists('eb_orb'), null, { timeout: 90000 });
await seite.waitForTimeout(1200);

// Ins Gefecht. Im Menue sind nicht alle Texturen da: der erste Lauf fand
// zehn Gegner statt vierzehn und keinen einzigen Boss — und meldete
// pflichtschuldig "da fehlt etwas". Es fehlte nichts, es war nur noch
// nichts gebacken. Ein Bogen, der die Haelfte nicht sieht, ist kein Bogen.
{
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
  if (!imSpiel) { await browser.close(); M.abbruch('kommt nicht ins Gefecht — dort erst entstehen die Gegnertexturen.'); }
}

// Die Anzeigegroessen fragt das Spiel: jeder Gegner wird einmal gesetzt und
// nach displayWidth/displayHeight gefragt, jeder Boss einmal gespawnt.
// Textur mal Ke-Skala waere eine zweite Rechnung — und eine falsche: im
// Gefecht wird in Anzeigeaufloesung neu gebacken, die Skala steht danach
// nicht mehr auf dem Wert aus der Tabelle (eiserne Regel 4).
const ANZEIGE = await seite.evaluate(async () => {
  const spiel = window.__game.scene.getScene('Game');
  const aus = {};
  for (const art of Object.keys(window.__SKF_GEGNER || {})) {
    try {
      spiel.spawnAt(art, 270, 0);
      const g = spiel.enemies.getChildren().filter((e) => e.active).pop();
      if (g) { aus[g.texture.key] = { w: g.displayWidth, h: g.displayHeight }; g.deactivate ? g.deactivate() : g.destroy(); }
    } catch (e) {}
  }
  // Fuer den Stufendurchlauf ALLE Bosstexturen halten. Im Spiel haelt
  // der Sektor nur seine eigene (5,9 MB gespart); hier werden alle
  // gebraucht, und der Speicher ist nicht das, was hier gemessen wird.
  try { window.__SKF_BOSSVORRAT && window.__SKF_BOSSVORRAT(spiel, 'alle'); } catch (e) {}
  for (let i = 0; i < 40; i++) {
    const t = window.__game.textures;
    if ([1, 2, 3, 4].every((a) => t.exists('boss' + a))) break;
    await new Promise((f) => setTimeout(f, 150));
  }
  for (const st of [1, 2, 3, 4, 5]) {
    if (spiel.boss) { spiel.boss.destroy(); spiel.boss = null; }
    try {
      spiel.spawnBoss(st);
      // Seit v55 haelt das Spiel nur die Bosstextur des laufenden Sektors.
      // Eine andere Stufe wird nachgeladen — nebenlaeufig, wie jedes Bild;
      // bis dahin traegt der Boss das naechstbeste. Ohne dieses Warten
      // standen im Bogen fuenf Mal dasselbe Bild und das Tor meldete
      // "nur 15 Gegner- und Bosstexturen gefunden".
      for (let i = 0; i < 40 && spiel.boss; i++) {
        if (spiel.boss.texture.key === 'boss' + spiel.boss.tier) break;
        await new Promise((f) => setTimeout(f, 150));
      }
      if (spiel.boss) aus[spiel.boss.texture.key] = { w: spiel.boss.displayWidth, h: spiel.boss.displayHeight };
    } catch (e) {}
  }
  if (spiel.boss) { spiel.boss.destroy(); spiel.boss = null; }
  return aus;
});
await seite.waitForTimeout(400);

const zeichne = (art, anzeige) => seite.evaluate(({ art, anzeige }) => {
  const tex = window.__game.textures;
  const alle = tex.getTextureKeys();
  const namen = (art === 'geschosse'
    ? alle.filter((k) => k.startsWith('eb_'))
    : alle.filter((k) => k.startsWith('e_') || /^boss[1-5]$/.test(k))).sort();
  if (!namen.length) return { namen: [] };

  // Anzeigegroesse: Textur mal Spielskala mal Zoom. Bosse stehen mit .5
  // im Bild (Puffergroesse, doppelte Weltgroesse) — das ist keine
  // Ausnahme, sondern dieselbe Rechnung.
  const groesse = (n, q) => (art === 'geschosse' || !anzeige[n])
    ? { w: q.width, h: q.height } : { w: anzeige[n].w, h: anzeige[n].h };
  const bilder = namen.map((n) => ({ n, q: tex.get(n).getSourceImage() }));
  const masse = bilder.map(({ n, q }) => groesse(n, q));
  const maxH = Math.max(...masse.map((a) => a.h)), maxW = Math.max(...masse.map((a) => a.w));
  const PRO = art === 'geschosse' ? 5 : 4;
  // Der Zoom kommt aus dem GROESSTEN Bild: alles passt in seine Zelle,
  // und die Groessenverhaeltnisse bleiben die des Spiels.
  const ZOOM = Math.max(1, Math.min(Math.floor(300 / maxW), Math.floor(340 / maxH)));
  const SPALTE = Math.ceil(maxW * ZOOM) + 34, ZEILE = Math.ceil(maxH * ZOOM) + 46;
  const zeilen = Math.ceil(namen.length / PRO);
  const tafel = SPALTE * PRO + 20;
  const c = document.createElement('canvas');
  c.width = tafel * 2; c.height = ZEILE * zeilen + 20;
  const t = c.getContext('2d');
  t.imageSmoothingEnabled = false;
  [['#10151c', '#cfe3f2', 0], ['#d8d2c4', '#2a2620', tafel]].forEach(([grund, schrift, dx]) => {
    t.fillStyle = grund; t.fillRect(dx, 0, tafel, c.height);
    bilder.forEach(({ n, q }, i) => {
      const a = masse[i], w = a.w * ZOOM, h = a.h * ZOOM;
      const x = dx + 10 + (i % PRO) * SPALTE + SPALTE / 2, y = 10 + Math.floor(i / PRO) * ZEILE + (ZEILE - 30) / 2;
      t.drawImage(q, x - w / 2, y - h / 2, w, h);
      t.font = '13px sans-serif'; t.textAlign = 'center'; t.fillStyle = schrift;
      t.fillText(`${n}  ${Math.round(a.w)}x${Math.round(a.h)}`, x, 10 + Math.floor(i / PRO) * ZEILE + ZEILE - 12);
    });
  });

  // Die Zahlen zum Bild.
  const gemessen = bilder.map(({ n, q }) => {
    const h = document.createElement('canvas');
    h.width = q.width; h.height = q.height;
    const g = h.getContext('2d'); g.drawImage(q, 0, 0);
    const d = g.getImageData(0, 0, q.width, q.height).data;
    const a = (x, y) => d[(y * q.width + x) * 4 + 3] / 255;
    const ecke = Math.max(a(0, 0), a(q.width - 1, 0), a(0, q.height - 1), a(q.width - 1, q.height - 1));
    // Anschnitt: der hoechste Alphawert auf den vier Randlinien.
    let rand = 0;
    for (let x = 0; x < q.width; x++) rand = Math.max(rand, a(x, 0), a(x, q.height - 1));
    for (let y = 0; y < q.height; y++) rand = Math.max(rand, a(0, y), a(q.width - 1, y));
    return { name: n, ecke, rand };
  });
  return { datei: c.toDataURL('image/png'), namen, gemessen, zoom: ZOOM };
}, { art, anzeige });

const anzeigeBekannt = (n) => ANZEIGE[n] !== undefined;

const boegen = [];
if (WAS === 'geschosse' || WAS === 'alle') boegen.push(['geschosse', 'art/bogen/geschosse.png']);
if (WAS === 'gegner' || WAS === 'alle') boegen.push(['gegner', 'art/bogen/gegner.png']);

for (const [art, standard] of boegen) {
  const ziel = argD && boegen.length === 1 ? argD.slice(8) : standard;
  const b = await zeichne(art, ANZEIGE);
  if (!b.namen.length) { M.befund(`keine Texturen fuer "${art}" gefunden.`); continue; }
  mkdirSync(dirname(ziel), { recursive: true });
  writeFileSync(ziel, Buffer.from(b.datei.split(',')[1], 'base64'));
  console.log(`\n${art} — ${b.namen.length} Texturen, ${b.zoom}-fach:  ${b.namen.join(', ')}`);
  console.log(`  geschrieben nach ${ziel}`);

  if (art === 'geschosse') {
    // Der abgeschnittene Hof. 0,03 ist die Grenze: darunter ist eine Ecke
    // praktisch leer, darueber steht ein sichtbares Rechteck.
    const ECKE_MAX = 0.03;
    const eckig = b.gemessen.filter((e) => e.ecke > ECKE_MAX).sort((x, y) => y.ecke - x.ecke);
    console.log(`  Eckdeckung (Grenze ${ECKE_MAX}): hoechste ${b.gemessen.reduce((a, e) => Math.max(a, e.ecke), 0).toFixed(3)}`);
    if (eckig.length)
      M.befund(`${eckig.length} Geschoss(e) haben einen abgeschnittenen Hof — die Ecken der Textur sind nicht leer `
        + `(${eckig.slice(0, 6).map((e) => `${e.name} ${e.ecke.toFixed(2)}`).join(', ')}). `
        + `Im Spiel steht dann ein dunkles Rechteck um die Kugel, sichtbar nur auf hellem Grund.`);
    if (b.namen.length < 10) M.befund(`nur ${b.namen.length} Geschosstexturen gefunden — da fehlt etwas.`);
  } else {
    // Kein Urteil ueber die Bilder — nur, ob alle da sind. Was hier stuende,
    // muesste erst einmal etwas messen, das man auf dem Bogen auch sieht.
    const leer = b.gemessen.filter((e) => e.rand === 0 && e.ecke === 0 && !anzeigeBekannt(e.name));
    console.log('  Anzeigegroessen aus dem Spiel; keine Bewertung — dieser Bogen ist zum Ansehen da.');
    if (leer.length) M.befund(`${leer.length} Bild(er) ohne bekannte Anzeigegroesse: ${leer.map((e) => e.name).join(', ')}.`);
    if (b.namen.length < 16) M.befund(`nur ${b.namen.length} Gegner- und Bosstexturen gefunden — da fehlt etwas.`);
  }
}

await browser.close();
M.urteil();

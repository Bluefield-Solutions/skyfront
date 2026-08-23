#!/usr/bin/env node
/*
  Farbtor — drei reservierte Farbbänder, nachgerechnet.

  Ein Spieler darf nie überlegen müssen, ob etwas ihn trifft oder ihm gehört.
  Deshalb hat jede der drei Kategorien ihr eigenes Band:

      Gefahr       jedes Gegnerprojektil          rot-orange
      Eigenfeuer   jedes Spielerprojektil         weiss-cyan
      Aufsammler   alles Einsammelbare            alles ausserhalb der beiden

  Dieses Tor liest die Farben aus src/app.js — nicht aus einer Liste, die hier
  gepflegt wird. Wer eine Farbe im Spiel ändert, ändert damit auch das, was
  hier gemessen wird. Findet es eine Tabelle nicht, ist es rot: ein Tor, das
  bei fehlender Quelle grün meldet, bezeugt nichts.

  Gemessen wird am Kernfarbwert, ohne den dunklen Rand und ohne den dunklen
  Hof, die jede Gegnerkugel trägt. Das ist die untere Schranke — der Rand
  hebt den Kontrast, er senkt ihn nie.
*/
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');
const quelle = readFileSync(join(wurzel, 'src', 'app.js'), 'utf8');

const befunde = [];
const melde = (t) => befunde.push(t);

/* ---------- Farbrechnung ---------------------------------------------- */

const hex = (s) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(s.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
};
const ausZahl = (n) => [n >> 16 & 255, n >> 8 & 255, n & 255];
const alsHex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');

// Graustufe nach Rec. 709 — das, was ein Farbenblinder noch unterscheidet.
const grau = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// relative Leuchtdichte nach WCAG, für das Kontrastverhältnis
const leucht = ([r, g, b]) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const verhaeltnis = (a, b) => {
  const [h, d] = a >= b ? [a, b] : [b, a];
  return (h + 0.05) / (d + 0.05);
};

const hsv = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d > 1e-9) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : d / max, v: max };
};
const winkel = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

/* ---------- Farben aus der Quelle holen -------------------------------- */

const konst = (name) => {
  const m = new RegExp(`\\b${name} = "(#[0-9a-fA-F]{6})"`).exec(quelle);
  if (!m) { melde(`Konstante ${name} nicht in src/app.js gefunden`); return null; }
  return hex(m[1]);
};
const konstN = (name) => {
  const m = new RegExp(`\\b${name} = (\\d+)`).exec(quelle);
  if (!m) { melde(`Konstante ${name} nicht in src/app.js gefunden`); return null; }
  return ausZahl(Number(m[1]));
};

const GEFAHR = konst('GEFAHR');
const EIGEN = konst('EIGEN');
const GEFAHR_N = konstN('GEFAHR_N');
const EIGEN_N = konstN('EIGEN_N');

if (GEFAHR && GEFAHR_N && alsHex(GEFAHR) !== alsHex(GEFAHR_N))
  melde(`GEFAHR ${alsHex(GEFAHR)} und GEFAHR_N ${alsHex(GEFAHR_N)} sind auseinandergelaufen`);
if (EIGEN && EIGEN_N && alsHex(EIGEN) !== alsHex(EIGEN_N))
  melde(`EIGEN ${alsHex(EIGEN)} und EIGEN_N ${alsHex(EIGEN_N)} sind auseinandergelaufen`);

// Der Ausschnitt mit den Texturanmeldungen: alles zwischen ht(T, "sea" und chokerock.
const anmeldung = (() => {
  const a = quelle.indexOf('ht(T, "sea"');
  const e = quelle.indexOf('"chokerock"');
  if (a < 0 || e < 0) { melde('Texturanmeldungen nicht gefunden'); return ''; }
  return quelle.slice(a, e);
})();

// alle Farbliterale und die beiden Konstanten aus einer ht(...)-Zeile ziehen
const farbenAus = (text) => {
  const raus = [];
  for (const m of text.matchAll(/#[0-9a-fA-F]{6}/g)) raus.push(hex(m[0]));
  if (/\bGEFAHR\b/.test(text) && GEFAHR) raus.push(GEFAHR);
  if (/\bEIGEN\b/.test(text) && EIGEN) raus.push(EIGEN);
  return raus;
};

// Zeichenfunktion zu einer Textur finden und ihren Körper einlesen
const koerper = (fn) => {
  const m = new RegExp(`\\n  function ${fn}\\(`).exec(quelle);
  if (!m) return '';
  const a = m.index;
  const e = quelle.indexOf('\n  }\n', a);
  return e < 0 ? '' : quelle.slice(a, e);
};

// Welche Textur wird von welcher Funktion gezeichnet, und mit welchen Argumenten?
// Klammern zählen statt raten: das letzte Argument darf selbst Klammern und
// Zeilenumbrüche enthalten (missile_p übergibt ein Objektliteral).
const texturen = new Map();
for (const m of anmeldung.matchAll(/ht\(T, "([a-z_0-9]+)", \d+, \d+, /g)) {
  let i = m.index + m[0].length, tiefe = 0, str = null;
  const a = i;
  for (; i < anmeldung.length; i++) {
    const c = anmeldung[i];
    if (str) { if (c === '\\') i++; else if (c === str) str = null; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (c === '(' || c === '{' || c === '[') tiefe++;
    else if (c === ')' || c === '}' || c === ']') { if (tiefe === 0) break; tiefe--; }
  }
  texturen.set(m[1], anmeldung.slice(a, i));
}

const farbenDerTextur = (name) => {
  const arg = texturen.get(name);
  if (arg === undefined) { melde(`Textur ${name} nicht in den Anmeldungen gefunden`); return []; }
  const aus = farbenAus(arg);
  // reiner Funktionsname: die Farben stecken in der Funktion selbst
  const fn = /^([A-Za-z]{1,3})$/.exec(arg.trim());
  if (fn) aus.push(...farbenAus(koerper(fn[1])));
  return aus;
};

/* ---------- die drei Mengen ------------------------------------------- */

const GEGNER_TEX = ['eb_orb', 'eb_bolt', 'eb_ring', 'eb_dart', 'eb_diamond',
  'eb_wave', 'eb_star', 'eb_needle', 'eb_flame', 'eb_saw', 'missile'];
const SPIELER_TEX = ['bullet_p', 'bullet_spread', 'bullet_focus', 'bullet_heavy', 'missile_p'];

const sammle = (liste) => {
  const s = [];
  for (const t of liste) for (const c of farbenDerTextur(t)) s.push({ c, quelle: t });
  return s;
};

const gegner = sammle(GEGNER_TEX);
const spieler = sammle(SPIELER_TEX);

// EB_STYLE.col — Spur und Mündungsfeuer der Gegnerkugel
const ebBlock = /yt\.EB_STYLE = \{[\s\S]*?\n  \}/.exec(quelle);
if (!ebBlock) melde('EB_STYLE nicht gefunden');
else {
  const cols = [...ebBlock[0].matchAll(/col: (GEFAHR_N|\d+)/g)];
  if (cols.length !== 10) melde(`EB_STYLE: ${cols.length} col-Einträge, 10 erwartet`);
  for (const m of cols) gegner.push({ c: m[1] === 'GEFAHR_N' ? GEFAHR_N : ausZahl(Number(m[1])), quelle: 'EB_STYLE.col' });
}

// Jt[*].tint — Waffenfarbe, sitzt in Spur und Mündungsfeuer des Spielers
const jtBlock = /\n    Jt = \{[\s\S]*?\n    \},/.exec(quelle);
if (!jtBlock) melde('Waffentabelle Jt nicht gefunden');
else {
  const tints = [...jtBlock[0].matchAll(/tint: (\d+)/g)];
  if (tints.length !== 4) melde(`Jt: ${tints.length} tint-Einträge, 4 erwartet`);
  for (const m of tints) spieler.push({ c: ausZahl(Number(m[1])), quelle: 'Jt.tint' });
}

// wt[*].bulletTint — Rückfall je Maschine
const wtTints = [...quelle.matchAll(/bulletTint: (\d+)/g)];
if (wtTints.length < 5) melde(`bulletTint: nur ${wtTints.length} Einträge gefunden`);
for (const m of wtTints) spieler.push({ c: ausZahl(Number(m[1])), quelle: 'bulletTint' });

// der Laserstrahl des Spielers
const laser = [...quelle.matchAll(/this\.laserGfx\.fillStyle\((EIGEN_N|\d+),/g)];
if (laser.length !== 2) melde(`Laserstrahl: ${laser.length} Farbwerte, 2 erwartet`);
for (const m of laser) spieler.push({ c: m[1] === 'EIGEN_N' ? EIGEN_N : ausZahl(Number(m[1])), quelle: 'Laser' });

// Aufsammler
const aufsammler = [];
for (const m of anmeldung.matchAll(/oe\(R, E, b, "(#[0-9a-fA-F]{6})", "(.)"\)/g))
  aufsammler.push({ c: hex(m[1]), quelle: 'pu ' + m[2] });
if (aufsammler.length !== 7) melde(`Aufsammler: ${aufsammler.length} gefunden, 7 erwartet`);

/* ---------- Prüfung A: kein Wert in zwei Kategorien -------------------- */

const menge = (l) => new Set(l.map((x) => alsHex(x.c)));
const mG = menge(gegner), mS = menge(spieler), mA = menge(aufsammler);
// Weiss und Schwarz sind Glanzlicht und Rand, keine Kategoriefarbe.
const neutral = (h) => { const { s, v } = hsv(hex(h)); return s < 0.16 || v < 0.14; };

for (const h of mG) if (mS.has(h) && !neutral(h)) melde(`A: ${h} trägt Gegner- UND Spielerfeuer`);
for (const h of mA) if (mG.has(h) && !neutral(h)) melde(`A: ${h} trägt Aufsammler UND Gegnerfeuer`);
for (const h of mA) if (mS.has(h) && !neutral(h)) melde(`A: ${h} trägt Aufsammler UND Spielerfeuer`);

/* ---------- Prüfung B: das Gefahrenband gehört den Gegnern ------------- */

const BAND = 25;   // Grad um GEFAHR herum
const SATT = 0.35; // darunter ist es Glanzlicht, keine Kennfarbe
const gH = GEFAHR ? hsv(GEFAHR).h : 0;

for (const [name, liste] of [['Spieler', spieler], ['Aufsammler', aufsammler]])
  for (const { c, quelle: q } of liste) {
    const { h, s, v } = hsv(c);
    if (s >= SATT && v >= 0.3 && winkel(h, gH) <= BAND)
      melde(`B: ${name} ${alsHex(c)} (${q}) liegt bei ${h.toFixed(0)}° im Gefahrenband ${gH.toFixed(0)}°±${BAND}`);
  }

// und umgekehrt: eine kräftige Gegnerfarbe ausserhalb des Bandes wäre eine zweite Sprache
for (const { c, quelle: q } of gegner) {
  const { h, s, v } = hsv(c);
  if (s >= SATT && v >= 0.3 && winkel(h, gH) > BAND)
    melde(`B: Gegner ${alsHex(c)} (${q}) liegt bei ${h.toFixed(0)}° ausserhalb des Gefahrenbandes`);
}

/* ---------- Prüfung C: Abstand in Graustufen --------------------------- */

const GRAU_MIN = 60;
if (GEFAHR && EIGEN) {
  const d = Math.abs(grau(EIGEN) - grau(GEFAHR));
  if (d < GRAU_MIN) melde(`C: Graustufenabstand ${d.toFixed(1)} < ${GRAU_MIN}`);
  console.log(`C  Graustufe  Eigenfeuer ${grau(EIGEN).toFixed(0)} · Gefahr ${grau(GEFAHR).toFixed(0)} · Abstand ${d.toFixed(1)} (Grenze ${GRAU_MIN})`);
}

/* ---------- Prüfung D: Kontrast gegen die Biome ------------------------ */

const KONTRAST_MIN = 3;
let biome = [];
try {
  const sharp = (await import('sharp')).default;
  const roh = readFileSync(join(wurzel, 'src', 'assets.js'), 'utf8');
  const feld = new Function('window', roh + '; return __SKFA;')({});
  const namen = [...quelle.matchAll(/(bg_[a-z]+): __SKFA\[(\d+)\]/g)];
  if (!namen.length) melde('Biomtabelle nicht gefunden');
  for (const [, name, idx] of namen) {
    const uri = feld[Number(idx)];
    const bin = Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64');
    const { data, info } = await sharp(bin).removeAlpha().resize(160, 160, { fit: 'fill' })
      .raw().toBuffer({ resolveWithObject: true });
    const l = [];
    for (let i = 0; i < data.length; i += info.channels) l.push(leucht([data[i], data[i + 1], data[i + 2]]));
    l.sort((a, b) => a - b);
    const p = (q) => l[Math.min(l.length - 1, Math.floor(q * l.length))];
    biome.push({ name, p5: p(0.05), p50: p(0.5), p95: p(0.95) });
  }
} catch (e) {
  melde('D: Biome nicht messbar — ' + e.message);
}

if (biome.length) {
  // WAS die Kennfarbe leistet und was nicht.
  //
  // Erster Anlauf hier war: Kennfarbe gegen Biom-Untergrund >= 3:1. Das ist
  // die falsche Messstelle, und die Zahlen sagen es selbst — #ff3a2a kommt
  // gegen Ozean, Duene, Felder und Dschungel auf 2,3 bis 3,0:1 und waere
  // damit durchgefallen, obwohl die Kugel dort tadellos zu sehen ist.
  //
  // Zu sehen ist sie, weil jede Kugel drei Schichten hat:
  //
  //     weisser Kern   ->   Kennfarbe   ->   dunkler Rand   ->   Grund
  //
  // Gefunden wird sie ueber Kern und Rand: auf dunklem Grund traegt der
  // Kern, auf hellem der Rand — einer von beiden loest immer ab. Die
  // Kennfarbe dazwischen sagt nicht, DASS da etwas ist, sondern WAS es ist,
  // und dafuer zaehlt der Farbtonabstand zu den anderen Kategorien (B),
  // nicht der Helligkeitsabstand zum Untergrund.
  //
  // Geprueft wird deshalb: die Kennfarbe muss sich vom eigenen Rand loesen
  // (sonst ist sie im Bild gar nicht da), und Kern und Rand muessen den
  // Grund tragen. Die Tabelle darunter steht vollstaendig, auch wo sie
  // schlecht aussieht — sie ist die Messung, nicht das Urteil.
  const RAND = hex('#0a0f18'), WEISS = hex('#ffffff');
  const LR = leucht(RAND), LW = leucht(WEISS);
  console.log(`D  Kontrast, Median-Untergrund der ${biome.length} Biome (Grenze ${KONTRAST_MIN}:1)`);
  for (const [name, farbe] of [['Eigenfeuer', EIGEN], ['Gefahr', GEFAHR]]) {
    if (!farbe) continue;
    const v = verhaeltnis(leucht(farbe), LR);
    if (v < KONTRAST_MIN) melde(`D: Kennfarbe ${name} ${alsHex(farbe)} loest sich nicht vom eigenen Rand (${v.toFixed(2)}:1)`);
    console.log(`   ${name.padEnd(10)} ${alsHex(farbe)} gegen den eigenen Rand ${alsHex(RAND)}: ${v.toFixed(2)}:1`);
  }
  const zeilen = [];
  for (const b of biome) {
    const kern = verhaeltnis(LW, b.p50), rnd = verhaeltnis(LR, b.p50);
    const eig = verhaeltnis(leucht(EIGEN), b.p50), gef = verhaeltnis(leucht(GEFAHR), b.p50);
    zeilen.push(`${b.name.replace('bg_', '').padEnd(8)} Kern ${kern.toFixed(1).padStart(5)} Rand ${rnd.toFixed(1).padStart(5)} | Eigen ${eig.toFixed(1).padStart(5)} Gefahr ${gef.toFixed(1).padStart(5)}`);
    if (Math.max(kern, rnd) < KONTRAST_MIN)
      melde(`D: ${b.name}: weder weisser Kern (${kern.toFixed(2)}:1) noch Rand (${rnd.toFixed(2)}:1) erreicht ${KONTRAST_MIN}:1`);
  }
  for (const z of zeilen) console.log('     ' + z);
}

/* ---------- Pruefung E: haben die Texturen die Schichten ueberhaupt? --- */

// Der Nachweis oben rechnet mit Kern und Rand. Er ist nur so viel wert wie
// die Zusicherung, dass jede Textur beide zeichnet. Beides steht und faellt
// zusammen — deshalb steht es hier und nicht in einem Kommentar.
const schichten = (t) => {
  const arg = texturen.get(t);
  if (arg === undefined) return null;
  let text = arg;
  for (const m of arg.matchAll(/\b([A-Za-z]{1,3})\(/g)) text += koerper(m[1]);
  const rein = /^\s*([A-Za-z]{1,3})\s*$/.exec(arg);
  if (rein) { text += koerper(rein[1]); for (const m of koerper(rein[1]).matchAll(/\b([A-Za-z]{1,3})\(/g)) text += koerper(m[1]); }
  const farben = [...text.matchAll(/#[0-9a-fA-F]{6}|rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)]
    .map((m) => m[0][0] === '#' ? hex(m[0]) : [Number(m[1]), Number(m[2]), Number(m[3])]);
  // Gemessen an der Leuchtdichte, nicht an Farbton und Saettigung: was zaehlt,
  // ist ob die Schicht gegen einen dunklen bzw. hellen Grund traegt. Der
  // erste Anlauf verlangte "fast weiss" (Saettigung <= 0,22) und meldete
  // deshalb die Gegnerrakete rot, deren hellste Schicht die cremefarbene
  // Stichflamme #fff2b0 ist — Leuchtdichte 0,88, sie traegt einwandfrei.
  return {
    hell: farben.some((c) => leucht(c) >= 0.6),
    dunkel: farben.some((c) => leucht(c) <= 0.05),
  };
};
for (const t of [...GEGNER_TEX, ...SPIELER_TEX]) {
  const l = schichten(t);
  if (!l) { melde(`E: ${t} nicht gefunden`); continue; }
  if (!l.hell) melde(`E: ${t} hat keinen hellen Kern — auf dunklem Grund traegt nichts`);
  if (!l.dunkel) melde(`E: ${t} hat keinen dunklen Rand — auf hellem Grund traegt nichts`);
}

// Und der Kugelkoerper des Spielers darf nicht additiv gezeichnet werden:
// additiv kann nur aufhellen, ein dunkler Rand kommt dabei nie an. Genau
// das war der Zustand vorher.
if (/BlendModes\.ADD\)\.setScale\(I \* this\.bulletScaleMul\)/.test(quelle))
  melde('E: Spielergeschosse werden additiv gezeichnet — der dunkle Rand traegt dann nicht');

/* ---------- Pruefung F: was am Ende wirklich im Bild steht -------------- */

// A bis E lesen Tabellen. Tabellen sagen nicht, wieviel FLAECHE eine Farbe
// am fertigen Sprite hat — und genau daran ist der erste Anlauf gescheitert:
// eb_needle, eb_bolt und eb_diamond trugen die richtige Kennfarbe an den
// Raendern und ein breites weisses Band in der Mitte. Auf dem Kontaktbogen
// waren sie hell und kalt und lasen sich als EIGENES Feuer. Kein statischer
// Wert hatte das gesehen, ein Blick auf den Bogen sofort.
//
// Deshalb zaehlt F die Pixel des gebauten Spiels: welcher Anteil der
// sichtbaren Flaeche traegt eine Farbe der falschen Kategorie?
//
// Uebersprungen wird nur, wenn dist/ oder Playwright fehlt — nie still bei
// einem Fehler.
const GERENDERT = !process.argv.includes('--nurstatisch');
const SATT_F = 0.25;           // darunter ist ein Pixel Glanzlicht oder Rand
// Grenzen anteilig, nie absolut — dieselbe Regel, an der der Bildtor schon
// einmal auf GitHub rot lief. Feste 35 % / 45 % waeren hier genauso falsch:
// bullet_spread und bullet_focus messen 48 %, das sind 1,07x Abstand. Ein
// anderer Chromium mit anderer Kantenglaettung kippt das.
//
// Bezug ist deshalb der MEDIAN der eigenen Kategorie: ein Projektil, dessen
// Kennfarbe im Bild nicht ankommt, faellt gegen seine elf Geschwister auf,
// ganz gleich wie hoch die Umgebung insgesamt misst. Gegengeprobt an der
// alten eb_needle: 23 % gegen einen Median von 67 % — sie faellt weiterhin.
const DECKUNG_ANTEIL = 0.6;
// Und ein letzter Halt, falls ALLE Texturen kaputt sind und es keinen
// gesunden Median mehr gibt. Weit weg von allem je Gemessenen (48 bis 75 %).
const DECKUNG_NOT = 0.2;
// Diese hier bleibt absolut: sie ist eine Obergrenze, und eine Obergrenze,
// die mit dem Gemessenen mitwandert, waere gar keine. Gemessen 0 bis 10 %.
const VERWECHSELBAR_MAX = 0.15;
if (GERENDERT) {
  const { existsSync } = await import('node:fs');
  const datei = join(wurzel, 'dist', 'Skyfront.html');
  if (!existsSync(datei)) {
    melde('F: dist/Skyfront.html fehlt — erst bauen (oder --nurstatisch)');
  } else {
    let chromium;
    try { ({ chromium } = await import('playwright')); }
    catch { chromium = null; console.log('F  (—) Playwright nicht gefunden — uebersprungen.'); }
    if (chromium) {
      const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
      try {
        const seite = await browser.newPage({ viewport: { width: 390, height: 844 } });
        await seite.goto('file://' + datei);
        await seite.waitForFunction(() => window.__game && window.__game.scene.scenes.some((x) => x.scene.isActive()), null, { timeout: 90000 });
        await seite.waitForTimeout(2500);
        const roh = await seite.evaluate((keys) => {
          const g = window.__game, aus = {};
          const c = document.createElement('canvas'), t = c.getContext('2d', { willReadFrequently: true });
          for (const k of keys) {
            if (!g.textures.exists(k)) { aus[k] = null; continue; }
            const src = g.textures.get(k).getSourceImage();
            c.width = src.width; c.height = src.height;
            t.clearRect(0, 0, c.width, c.height); t.drawImage(src, 0, 0);
            aus[k] = Array.from(t.getImageData(0, 0, c.width, c.height).data);
          }
          return aus;
        }, [...GEGNER_TEX, ...SPIELER_TEX]);
        await browser.close();
        console.log(`F  Am gebauten Spiel gezaehlt · Gefahr = warm und satt, Eigenfeuer = hell`);
        const gemessen = [];
        for (const k of [...GEGNER_TEX, ...SPIELER_TEX]) {
          const d = roh[k];
          if (!d) { melde(`F: Textur ${k} im gebauten Spiel nicht vorhanden`); continue; }
          const gegnerSeite = GEGNER_TEX.includes(k);
          // Zwei Kategorien, zwei Signale — und deshalb zwei Zaehlungen.
          //
          // Gefahr liest sich ueber Farbe: warm und satt.
          // Eigenfeuer liest sich ueber Helligkeit: hell und nicht warm.
          //   (#bfefff hat Saettigung 0,25 — es IST fast weiss. Das ist
          //    Absicht: weiss gehoert mir, rot gehoert denen. Eine
          //    Deckungsgrenze, die fuer Rot geeicht ist, wuerde das zu
          //    Unrecht rot melden — der erste Anlauf tat genau das.)
          //
          // Verwechselbar ist ein Punkt, der das Signal der ANDEREN Seite
          // traegt. Das ist die Zahl, auf die es ankommt.
          let sichtbar = 0, eigenSignal = 0, verwechselbar = 0;
          for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 128) continue;
            const c = [d[i], d[i + 1], d[i + 2]];
            const { h, s } = hsv(c);
            const L = leucht(c);
            sichtbar++;
            const warm = s >= SATT_F && winkel(h, gH) <= BAND;
            const hell = L >= 0.6;
            if (gegnerSeite) { if (warm) eigenSignal++; else if (hell) verwechselbar++; }
            else { if (hell) eigenSignal++; else if (warm) verwechselbar++; }
          }
          gemessen.push({ k, gegnerSeite, deckung: sichtbar ? eigenSignal / sichtbar : 0, falsch: sichtbar ? verwechselbar / sichtbar : 0 });
        }
        const median = (l) => { const a = [...l].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 0; };
        for (const seite of [true, false]) {
          const teil = gemessen.filter((m) => m.gegnerSeite === seite);
          if (!teil.length) continue;
          const med = median(teil.map((m) => m.deckung));
          const grenze = Math.max(DECKUNG_NOT, med * DECKUNG_ANTEIL);
          console.log(`   ${seite ? 'Gefahr    ' : 'Eigenfeuer'} Median ${(med * 100).toFixed(0)} % → Grenze ${(grenze * 100).toFixed(0)} %`);
          for (const m of teil) {
            console.log(`     ${m.k.padEnd(14)} eigenes Signal ${(m.deckung * 100).toFixed(0).padStart(3)} % · verwechselbar ${(m.falsch * 100).toFixed(0).padStart(3)} %`);
            if (m.deckung < grenze)
              melde(`F: ${m.k} — eigenes Signal auf nur ${(m.deckung * 100).toFixed(0)} % der sichtbaren Flaeche (Median der Kategorie ${(med * 100).toFixed(0)} %, Grenze ${(grenze * 100).toFixed(0)} %)`);
            if (m.falsch > VERWECHSELBAR_MAX)
              melde(`F: ${m.k} — ${(m.falsch * 100).toFixed(0)} % der Flaeche traegt das Signal der anderen Seite (Grenze ${(VERWECHSELBAR_MAX * 100).toFixed(0)} %)`);
          }
        }
      } catch (e) {
        await browser.close().catch(() => {});
        melde('F: gerenderte Pruefung fehlgeschlagen — ' + e.message);
      }
    }
  }
}

/* ---------- Pruefung G: was ueber den Gegnerkugeln liegt --------------- */

// Die Gegnerkugeln fliegen auf Tiefe 20. Alles, was additiv darueber liegt,
// kann sie ueberstrahlen — additiv heisst aufhellen, und eine ueberstrahlte
// Kugel ist eine Kugel, die man nicht kommen sieht.
//
// Gefunden hatte das Audit den Fall bei `impact`: drei additive Effekte auf
// Tiefe 21, ausgeloest bei JEDEM Treffer, also dutzendfach in der Sekunde.
//
// Es gibt genau eine erlaubte Ausnahme, und sie hat einen Namen:
// TIEFE_UEBER_GEFAHR. Wer sie benutzt, muss begruenden koennen, dass sein
// Effekt den Schirm ohnehin leerraeumt — der Sturm loescht alle
// Gegnerkugeln, er kann keine verdecken. Eine Zahl im Quelltext waere
// dieselbe Entscheidung, nur ohne Begruendung und ohne Spur.
const BAND_VON = 20, BAND_BIS = 60;   // darueber faengt die Bedienoberflaeche an
{
  const treffer = [];
  // fxFly zeichnet ohne ausdrueckliche Angabe additiv.
  for (const m of quelle.matchAll(/this\.fxFly\(/g)) {
    let i = m.index + m[0].length, tiefe = 0, str = null;
    const a = i;
    for (; i < quelle.length; i++) {
      const c = quelle[i];
      if (str) { if (c === '\\') i++; else if (c === str) str = null; continue; }
      if (c === '"' || c === "'" || c === '`') { str = c; continue; }
      if (c === '(' || c === '{' || c === '[') tiefe++;
      else if (c === ')' || c === '}' || c === ']') { if (tiefe === 0) break; tiefe--; }
    }
    const arg = quelle.slice(a, i);
    if (/blend:\s*tt\.BlendModes\.NORMAL/.test(arg)) continue;
    const d = /depth:\s*([A-Za-z_0-9.]+)/.exec(arg);
    if (!d) continue;
    const zeile = quelle.slice(0, m.index).split('\n').length;
    if (/^\d+$/.test(d[1])) {
      const n = Number(d[1]);
      if (n >= BAND_VON && n < BAND_BIS) treffer.push({ zeile, wert: d[1], art: 'fxFly' });
    } else if (d[1] !== 'TIEFE_UEBER_GEFAHR' && d[1] !== 'TIEFE_WIRKUNG' && !/^I\.|^G\./.test(d[1])) {
      treffer.push({ zeile, wert: d[1], art: 'fxFly (unbekannte Konstante)' });
    }
  }
  // und einzeln gesetzte additive Bilder
  for (const re of [/setBlendMode\(tt\.BlendModes\.ADD\)[^;\n]{0,90}?setDepth\((\d+)\)/g,
                    /setDepth\((\d+)\)[^;\n]{0,90}?setBlendMode\(tt\.BlendModes\.ADD\)/g])
    for (const m of quelle.matchAll(re)) {
      const n = Number(m[1]);
      if (n >= BAND_VON && n < BAND_BIS)
        treffer.push({ zeile: quelle.slice(0, m.index).split('\n').length, wert: m[1], art: 'setDepth' });
    }

  const ausnahmen = (quelle.match(/depth: TIEFE_UEBER_GEFAHR/g) || []).length;
  console.log(`G  Additive Wirkung im Gefahrenband ${BAND_VON}..${BAND_BIS - 1}: ${treffer.length} · benannte Ausnahmen (TIEFE_UEBER_GEFAHR): ${ausnahmen}`);
  for (const t of treffer)
    melde(`G: additive Wirkung auf Tiefe ${t.wert} (${t.art}, Zeile ${t.zeile}) liegt ueber den Gegnerkugeln`);
  if (!/TIEFE_KUGEL = 20/.test(quelle))
    melde('G: TIEFE_KUGEL nicht gefunden — die Tiefenordnung ist nicht mehr die geprüfte');
}

/* ---------- Bericht ---------------------------------------------------- */

console.log(`\nA  Gegnerprojektile ${mG.size} Farbwerte · Spielerprojektile ${mS.size} · Aufsammler ${mA.size}`);
console.log(`B  Gefahrenband ${gH.toFixed(0)}°±${BAND}, Sättigung ab ${SATT}`);

if (befunde.length) {
  console.log('\nFARBTOR ROT — ' + befunde.length + ' Befund(e):');
  for (const b of befunde) console.log('  · ' + b);
  process.exit(1);
}
console.log('\nFARBTOR GRÜN — die drei Bänder überschneiden sich nicht.');

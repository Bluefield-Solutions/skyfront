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
// Pruefungen, die gar nicht erst gelaufen sind. Das ist kein Befund — aber
// der Bericht darf es nicht als "ohne Befund" ausgeben.
const nichtGemessen = [];

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
  'eb_wave', 'eb_star', 'eb_needle', 'eb_flame', 'eb_saw', 'eb_lanze', 'missile'];
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
  if (cols.length !== 11) melde(`EB_STYLE: ${cols.length} col-Einträge, 11 erwartet`);
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

/* ---------- Pruefung K: der Kraftstreifen ueber den Gegnern ------------ */

// Er wird nicht als Textur gezeichnet, sondern als Graphics — die
// Texturpruefungen unten sehen ihn also gar nicht. Geprueft wird deshalb
// statisch an der Quelle, und zwar dasselbe wie bei jedem Geschoss: hat er
// eine dunkle Unterlage, und ist er auf dem ZIELGERAET ueberhaupt zu sehen?
//
// Die Hoehe steht in Layoutpunkten (Raum 540 breit), das Geraet hat 390.
// Vier Layoutpunkte waeren 2,9 Anzeigepunkte — eine Linie, kein Balken.
{
  const LEISTE_MIN_ANZEIGE = 3;      // Anzeigepunkte
  const RAUM = 540, GERAET = 390;
  const m = /const LEISTE_AB = (\d+), LEISTE_HOCH = (\d+)/.exec(quelle);
  if (!m) melde('K: LEISTE_AB / LEISTE_HOCH nicht in src/app.js gefunden — der Kraftstreifen ist nicht zu pruefen');
  else {
    const hoch = Number(m[2]), anzeige = hoch * GERAET / RAUM;
    console.log(`K  Kraftstreifen ab ${m[1]} Trefferpunkten, ${hoch} Layoutpunkte hoch = ${anzeige.toFixed(1)} Anzeigepunkte`);
    if (anzeige < LEISTE_MIN_ANZEIGE)
      melde(`K: der Kraftstreifen ist auf dem Geraet nur ${anzeige.toFixed(1)} Punkte hoch (mindestens ${LEISTE_MIN_ANZEIGE}) — das ist eine Linie, kein Balken`);
    const rumpf = koerper('gegnerLeisten') || (/gegnerLeisten\(\)\s*\{[\s\S]*?\n      \}/.exec(quelle) || [''])[0];
    if (!rumpf) melde('K: gegnerLeisten() nicht gefunden');
    else {
      const farben = [...rumpf.matchAll(/fillStyle\((\d+)/g)].map((x) => ausZahl(Number(x[1])));
      if (!farben.length) melde('K: der Kraftstreifen zeichnet keine Farbe');
      else if (!farben.some((c) => leucht(c) <= .05))
        melde('K: der Kraftstreifen hat keine dunkle Unterlage — ueber hellem Untergrund traegt er nicht, genau wie ein Geschoss ohne Rand');
    }
  }
}

/* ---------- Pruefung E: haben die Texturen die Schichten ueberhaupt? --- */

// Der Nachweis oben rechnet mit Kern und Rand. Er ist nur so viel wert wie
// die Zusicherung, dass jede Textur beide zeichnet. Beides steht und faellt
// zusammen — deshalb steht es hier und nicht in einem Kommentar.
const schichten = (t) => {
  const arg = texturen.get(t);
  if (arg === undefined) return null;
  // Bis zu 24 Zeichen, nicht bis zu drei.
  //
  // Der erste Entwurf suchte nur Bezeichner von einem bis drei Zeichen —
  // die Laenge, die der Minifizierer vergibt. Beim ersten von Hand
  // geschriebenen Zeichner (lanzeZeichnen, dreizehn Zeichen) fand die
  // Pruefung den Rumpf deshalb gar nicht und meldete "kein heller Kern,
  // kein dunkler Rand" fuer eine Textur, die beides hat. koerper() gibt
  // fuer unbekannte Namen einen leeren Text zurueck, weiter zu suchen
  // kostet also nichts.
  let text = arg;
  for (const m of arg.matchAll(/\b([A-Za-z]{1,24})\(/g)) text += koerper(m[1]);
  const rein = /^\s*([A-Za-z]{1,24})\s*$/.exec(arg);
  if (rein) { text += koerper(rein[1]); for (const m of koerper(rein[1]).matchAll(/\b([A-Za-z]{1,24})\(/g)) text += koerper(m[1]); }
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
    catch { chromium = null; console.log('F  (—) Playwright nicht gefunden — uebersprungen.'); nichtGemessen.push('F'); }
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

/* ---------- Pruefung H: die Kennleuchten der Gegner --------------------- */

// Seit v-Kennleuchte tragen zwei Gegnerrollen ein Positionslicht an den
// Fluegelspitzen: gruen fuer den Stuerzer, violett fuer den Schuetzen. Das
// ist eine VIERTE Farbsprache in einem Kreis, der schon neun reservierte
// Farben traegt (Gefahr, Eigenfeuer, sieben Aufsammler).
//
// Was dieses Tor beweist und was nicht:
//
//   Es beweist NICHT, dass die Leuchte von einem Aufsammler ueber den
//   Farbton allein zu unterscheiden ist. Der Kreis ist dafuer zu voll —
//   der beste erreichbare reine Winkel liegt bei 33 Grad. Wer das behauptet,
//   behauptet mehr als die Zahlen hergeben.
//
//   Es beweist, dass die Trennung ueber die Summe aus Farbton UND
//   Helligkeit traegt, dass keine Leuchte in einem der beiden
//   Projektilbaender liegt, dass die beiden untereinander auch fuer einen
//   Farbenblinden auseinanderfallen — und dass die Leuchte im Bild eine
//   ganz andere GROESSE hat als ein Aufsammler. Das Letzte ist der
//   eigentliche Trennungsgrund, und es ist der einzige, der auch dann noch
//   traegt, wenn der Farbkreis irgendwann ueberlaeuft.

const leuchtBlock = /LEUCHTE_FARBE = \{([^}]*)\}/.exec(quelle);
if (!leuchtBlock) melde('H: LEUCHTE_FARBE nicht in src/app.js gefunden');
else {
  const leuchten = [...leuchtBlock[1].matchAll(/(\w+): "(#[0-9a-fA-F]{6})"/g)]
    .map((m) => ({ rolle: m[1], c: hex(m[2]) }));
  if (leuchten.length < 2) melde(`H: nur ${leuchten.length} Kennleuchte(n) gefunden, mindestens 2 erwartet`);

  // Alles, was der Kreis schon traegt.
  const belegt = [];
  if (GEFAHR) belegt.push({ n: 'Gefahr', c: GEFAHR });
  if (EIGEN) belegt.push({ n: 'Eigenfeuer', c: EIGEN });
  for (const a of aufsammler) belegt.push({ n: a.quelle, c: a.c });

  // Das Abstandsmass. Farbton in Grad, dazu der halbe Graustufenabstand,
  // gedeckelt bei 60 — eine Farbe wird nicht beliebig unterscheidbar, nur
  // weil sie sehr viel heller ist. Gegengeprobt: mit dem alten #8a6cff
  // kommt schuetze auf 38 und faellt.
  const LEUCHT_ABSTAND_MIN = 45;
  const abstand = (a, b) => winkel(hsv(a).h, hsv(b).h) + Math.min(60, Math.abs(grau(a) - grau(b)) * 0.5);

  console.log(`H  Kennleuchten gegen ${belegt.length} belegte Farben (Grenze ${LEUCHT_ABSTAND_MIN})`);
  for (const l of leuchten) {
    const { h, s, v } = hsv(l.c);
    let min = Infinity, wer = '', minWinkel = Infinity;
    for (const b of belegt) {
      const d = abstand(l.c, b.c);
      if (d < min) { min = d; wer = b.n; }
      minWinkel = Math.min(minWinkel, winkel(h, hsv(b.c).h));
    }
    console.log(`   ${l.rolle.padEnd(10)} ${alsHex(l.c)} H${h.toFixed(0).padStart(3)} S${s.toFixed(2)} grau ${grau(l.c).toFixed(0).padStart(3)} · naechste ${wer} bei ${min.toFixed(0)} (reiner Winkel ${minWinkel.toFixed(0)})`);
    if (min < LEUCHT_ABSTAND_MIN)
      melde(`H: Kennleuchte ${l.rolle} ${alsHex(l.c)} liegt nur ${min.toFixed(0)} von ${wer} entfernt (Grenze ${LEUCHT_ABSTAND_MIN})`);

    // In keinem der beiden Projektilbaender — eine Leuchte, die sich als
    // Geschoss liest, ist schlimmer als gar keine.
    if (s >= SATT && v >= 0.3 && winkel(h, gH) <= BAND)
      melde(`H: Kennleuchte ${l.rolle} ${alsHex(l.c)} liegt bei ${h.toFixed(0)}° im Gefahrenband`);
    // und nicht so entsaettigt, dass sie zu Eigenfeuer wird
    if (EIGEN && s <= hsv(EIGEN).s + 0.06)
      melde(`H: Kennleuchte ${l.rolle} ${alsHex(l.c)} hat Saettigung ${s.toFixed(2)} — zu nah an Eigenfeuer (${hsv(EIGEN).s.toFixed(2)})`);
    // Sie muss leuchten. Auf dunklem Rumpf und dunklem Saum traegt nur,
    // was hell ist.
    if (grau(l.c) < 110)
      melde(`H: Kennleuchte ${l.rolle} ${alsHex(l.c)} hat Graustufe ${grau(l.c).toFixed(0)} — auf dunklem Rumpf traegt sie nicht`);
  }

  // Die Leuchten untereinander: hier zaehlt der Graustufenabstand voll,
  // denn sie stehen in derselben Welle nebeneinander im Bild.
  const LEUCHT_UNTER_MIN = 100;
  for (let i = 0; i < leuchten.length; i++)
    for (let j = i + 1; j < leuchten.length; j++) {
      const a = leuchten[i], b = leuchten[j];
      const d = winkel(hsv(a.c).h, hsv(b.c).h) + Math.min(80, Math.abs(grau(a.c) - grau(b.c)));
      console.log(`   ${a.rolle} gegen ${b.rolle}: ${d.toFixed(0)} (Grenze ${LEUCHT_UNTER_MIN})`);
      if (d < LEUCHT_UNTER_MIN)
        melde(`H: Kennleuchten ${a.rolle} und ${b.rolle} liegen nur ${d.toFixed(0)} auseinander`);
    }

  // WORAN DIE LEUCHTE GEFUNDEN WIRD — und woran nicht.
  //
  // Naheliegend waere: Kennfarbe gegen den Biom-Untergrund. Gemessen ueber
  // alle dreizehn Biome kommt dabei heraus, dass Violett auf Frost nur
  // 1,34:1 erreicht — was nach einem schweren Mangel aussieht und keiner
  // ist. Es ist dieselbe falsche Messstelle wie bei den Kugeln (siehe D):
  // die Leuchte sitzt IM dunklen Rumpf, nicht auf dem Biom.
  //
  // Gefunden wird sie ueber ihren hellen KERN gegen den dunklen Saum, und
  // das sind 15 bis 18:1. Genau diese Kette war von keinem Tor geschuetzt:
  // wer den Kern dunkler mischt, macht die Leuchte unsichtbar, und keine
  // Zahl haette angeschlagen. Ein rein WEISSER Kern ist uebrigens auch
  // falsch — er frisst die Kennfarbe auf (der Fehler von eb_needle, und
  // beim ersten Anlauf der Leuchte noch einmal). Deshalb beides.
  {
    const mKern = /m\.addColorStop\(0, heller\(r, ([0-9.]+)\)\)/.exec(quelle);
    const mRing = /m\.addColorStop\(\.3, heller\(r, ([0-9.]+)\)\)/.exec(quelle);
    const mSaum = /a\.fillStyle = "(#[0-9a-fA-F]{6})", a\.fillRect/.exec(quelle);
    if (!mKern) melde('H: der Kern der Kennleuchte ist nicht zu finden (heller(r, …) im Verlauf)');
    else if (!mRing) melde('H: der Zwischenring der Kennleuchte ist nicht zu finden');
    else if (!mSaum) melde('H: die Saumfarbe ist nicht zu finden');
    else {
      const anteil = Number(mKern[1]), ring = Number(mRing[1]), saum = hex(mSaum[1]);
      // Die untere Grenze kommt aus dem VERLAUF selbst, nicht aus einer
      // absoluten Zahl. Ein erster Anlauf verlangte nur "Kern gegen Saum
      // >= 8:1" — und das konnte fuer die GRUENE Leuchte nie anschlagen:
      // sie ist so hell, dass sie selbst mit Faktor 0 auf 13:1 kommt. Eine
      // Pruefung, die fuer die Haelfte der Faelle tot ist, ist keine.
      //
      // Was den Kern zum Kern macht, ist der Abstand zum Zwischenring: ist
      // er nicht deutlich heller, gibt es keinen Verlauf und damit kein
      // Leuchten, sondern eine flache Scheibe.
      const KERN_UEBER_RING = 0.15;
      if (anteil < ring + KERN_UEBER_RING)
        melde(`H: der Kern der Kennleuchte ist mit ${(anteil * 100).toFixed(0)} % kaum heller als der Zwischenring (${(ring * 100).toFixed(0)} %) — das ist kein Verlauf mehr, sondern eine flache Scheibe`);
      const KERN_MIN = 8;        // gemessen 15,4 und 17,7 — reichlich Luft
      const KERN_MAX_ANTEIL = 0.85;  // darueber frisst Weiss die Kennfarbe
      const heller = (c, r) => c.map((v) => Math.round(v + (255 - v) * r));
      console.log(`   Kern ${(anteil * 100).toFixed(0)} % · Zwischenring ${(ring * 100).toFixed(0)} % gegen Weiss gemischt, Saum ${alsHex(saum)}`);
      for (const l of leuchten) {
        const kern = heller(l.c, anteil);
        const v = verhaeltnis(leucht(kern), leucht(saum));
        console.log(`   ${l.rolle.padEnd(10)} Kern ${alsHex(kern)} gegen den Saum: ${v.toFixed(2)}:1 (Grenze ${KERN_MIN})`);
        if (v < KERN_MIN)
          melde(`H: der Kern der Kennleuchte ${l.rolle} loest sich nicht vom dunklen Saum (${v.toFixed(2)}:1, Grenze ${KERN_MIN}) — dann ist sie im Rumpf nicht zu finden`);
      }
      if (anteil > KERN_MAX_ANTEIL)
        melde(`H: der Kern ist zu ${(anteil * 100).toFixed(0)} % weiss (Grenze ${KERN_MAX_ANTEIL * 100} %) — bei zuviel Weiss bleibt von der Kennfarbe nichts uebrig (der Fehler von eb_needle)`);
    }
  }

  // Die Groessenregel steht nicht hier, sondern in H2 weiter unten: sie
  // braucht die ECHTEN Texturbreiten, und die kommen erst aus dem WebP-Vorrat
  // des gebauten Spiels. Ein erster Anlauf rechnete sie hier statisch aus der
  // breitesten ht()-Anmeldung und kam auf Faktor 1,67 statt 6,6 — er nahm den
  // Traeger (297 px), der die Rolle panzer hat und gar keine Leuchte traegt,
  // und liess cfg.scale ganz weg. Die Zahl war falsch, das Tor rot, und beides
  // aus demselben Grund: falsche Messstelle.
}

/* ---------- Pruefung H2: wie gross die Kennleuchte im Bild wirklich ist -- */

// H hat gezeigt, dass Farbton und Helligkeit die Leuchte nicht vollstaendig
// von den Aufsammlern trennen — der reine Winkel kommt beim Schuetzen auf 33
// Grad und mehr ist im vollen Kreis nicht zu haben. Was sie trennt, ist die
// GROESSE, und die ist nur am gebauten Spiel zu messen: die Gegnerbilder
// kommen aus dem WebP-Vorrat, ihre Breiten stehen in keiner Tabelle.
//
// Gerechnet wird genau die Zeile aus gegnerBacken:
//     h = max(LEUCHTE_PUNKTE / (scale * ANZEIGE), texturBreite * LEUCHTE_ANTEIL)
// in Texturpunkten, mal scale * ANZEIGE ergibt den Anzeigeradius.
//
// Uebersprungen wird nur, wenn dist/ oder Playwright fehlt — nie still bei
// einem Fehler, und nie mit einer unvollstaendigen Texturliste: ht() nimmt
// eine Textur WEG und legt sie neu an, der WebP-Vorrat ersetzt dieselben
// Schluessel noch einmal. Nach 3 s fehlten fuenf von dreizehn. Deshalb wird
// auf Stillstand gewartet, nicht auf die Uhr.
if (GERENDERT) {
  const { existsSync } = await import('node:fs');
  const datei = join(wurzel, 'dist', 'Skyfront.html');
  const leuchtBlock2 = /LEUCHTE_FARBE = \{([^}]*)\}/.exec(quelle);
  const rollen = leuchtBlock2
    ? [...leuchtBlock2[1].matchAll(/(\w+): "#[0-9a-fA-F]{6}"/g)].map((m) => m[1]) : [];

  // Welche Gegner tragen eine dieser Rollen, und mit welchem scale?
  const traeger = [];
  {
    const a = quelle.indexOf('const Ke = {');
    const e = quelle.indexOf('\n  };', a);
    if (a < 0 || e < 0) melde('H2: Gegnertabelle Ke nicht gefunden');
    else for (const m of quelle.slice(a, e).matchAll(/\n    (\w+): \{([\s\S]*?)\n    \}/g)) {
      const r = /rolle: "(\w+)"/.exec(m[2]);
      const sc = /scale: ([0-9.]+)/.exec(m[2]);
      if (r && sc && rollen.includes(r[1])) traeger.push({ k: m[1], rolle: r[1], scale: Number(sc[1]) });
    }
    if (!traeger.length) melde('H2: kein Gegner mit Kennleuchte in Ke gefunden — traegt sie ueberhaupt jemand?');
  }

  const lp2 = (() => { const m = /\bLEUCHTE_PUNKTE = ([0-9.]+)/.exec(quelle); return m ? Number(m[1]) : null; })();
  const la2 = (() => { const m = /\bLEUCHTE_ANTEIL = ([0-9.]+)/.exec(quelle); return m ? Number(m[1]) : null; })();
  if (lp2 === null) melde('H2: LEUCHTE_PUNKTE nicht gefunden');
  if (la2 === null) melde('H2: LEUCHTE_ANTEIL nicht gefunden');

  if (!existsSync(datei)) {
    melde('H2: dist/Skyfront.html fehlt — erst bauen (oder --nurstatisch)');
  } else if (traeger.length && lp2 !== null && la2 !== null) {
    let chromium2;
    try { ({ chromium: chromium2 } = await import('playwright')); }
    catch { chromium2 = null; console.log('H2 (—) Playwright nicht gefunden — uebersprungen.'); nichtGemessen.push('H2'); }
    if (chromium2) {
      const browser = await chromium2.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
      try {
        const seite = await browser.newPage({ viewport: { width: 390, height: 844 } });
        await seite.goto('file://' + datei);
        await seite.waitForFunction(() => window.__game && window.__game.scene.scenes.some((x) => x.scene.isActive()), null, { timeout: 90000 });

        const schluessel = [...traeger.map((t) => 'e_' + t.k), 'pu_power', 'pu_shield', 'pu_bomb', 'pu_coin', 'pu_part', 'pu_core', 'pu_slow'];
        const lies = () => seite.evaluate((ks) => {
          const g = window.__game, aus = {};
          for (const k of ks) aus[k] = g.textures.exists(k)
            ? [g.textures.get(k).getSourceImage().width, g.textures.get(k).getSourceImage().height] : null;
          return aus;
        }, schluessel);

        let masse = null, letzte = '', gleich = 0;
        for (let i = 0; i < 120; i++) {
          await seite.waitForTimeout(400);
          const jetzt = await lies();
          const abdruck = JSON.stringify(jetzt);
          if (abdruck === letzte) { if (++gleich >= 4 && !Object.values(jetzt).includes(null)) { masse = jetzt; break; } }
          else { gleich = 0; letzte = abdruck; }
        }
        await browser.close();

        if (!masse) {
          const fehlend = schluessel.filter((k) => { try { return !JSON.parse(letzte || '{}')[k]; } catch { return true; } });
          melde(`H2: Texturliste kam nicht zum Stillstand — es fehlen ${fehlend.join(', ') || '(unbekannt)'}. Eine Messung an einer unvollstaendigen Liste ist kein Beweis.`);
        } else {
          const ANZEIGE = 390 / 540;
          // Der kleinste Aufsammler im Bild — er ist der, mit dem eine Leuchte
          // am ehesten zu verwechseln waere.
          let puMin = Infinity, puWer = '';
          for (const k of schluessel) if (k.startsWith('pu_')) {
            const d = masse[k][0] * ANZEIGE;
            if (d < puMin) { puMin = d; puWer = k; }
          }
          const FAKTOR_MIN = 2.5;
          console.log(`H2 Groesse im Bild auf 390 px · kleinster Aufsammler ${puWer} ${puMin.toFixed(1)} Anzeigepunkte (Grenze Faktor ${FAKTOR_MIN})`);
          for (const t of traeger) {
            const tw = masse['e_' + t.k][0];
            const sk = t.scale * ANZEIGE;
            const radiusTex = Math.max(lp2 / Math.max(0.05, sk), tw * la2);
            const durchmesser = 2 * radiusTex * sk;
            const spriteBreite = tw * sk;
            const faktor = puMin / durchmesser;
            console.log(`   ${t.k.padEnd(11)} ${t.rolle.padEnd(9)} Bild ${spriteBreite.toFixed(1).padStart(5)} · Leuchte ${durchmesser.toFixed(2).padStart(5)} (${(100 * durchmesser / spriteBreite).toFixed(0).padStart(2)} % davon) · Faktor ${faktor.toFixed(1)}`);
            if (faktor < FAKTOR_MIN)
              melde(`H2: Kennleuchte von ${t.k} ist ${durchmesser.toFixed(1)} Anzeigepunkte gross, der kleinste Aufsammler ${puMin.toFixed(1)} — Faktor ${faktor.toFixed(1)} unter ${FAKTOR_MIN}. Der Farbton allein traegt die Trennung nicht (H: reiner Winkel bis herunter zu 33 Grad).`);
          }
        }
      } catch (e) {
        await browser.close().catch(() => {});
        melde('H2: Groessenmessung fehlgeschlagen — ' + e.message);
      }
    }
  }
}

/* ---------- Bericht ---------------------------------------------------- */

console.log(`\nA  Gegnerprojektile ${mG.size} Farbwerte · Spielerprojektile ${mS.size} · Aufsammler ${mA.size}`);
console.log(`B  Gefahrenband ${gH.toFixed(0)}°±${BAND}, Sättigung ab ${SATT}`);

if (befunde.length) {
  console.log('\nFARBTOR ROT — ' + befunde.length + ' Befund(e):');
  for (const b of befunde) console.log('  · ' + b);
  process.exit(1);
}
if (nichtGemessen.length) {
  console.log(`\nFARBTOR GRÜN, soweit gemessen — ${nichtGemessen.join(' und ')} sind gar nicht gelaufen.`);
  process.exit(2);
}
console.log('\nFARBTOR GRÜN — die drei Bänder überschneiden sich nicht.');

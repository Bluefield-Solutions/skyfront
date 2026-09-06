#!/usr/bin/env node
/*
  Bestellung — was fehlt noch, in welchem Format, und wo steht der Prompt?

    node tools/bestellung.mjs

  DER ANLASS: die Auftragsbögen sind zusammen über 900 Zeilen. Wer wissen
  will, was noch offen ist, muss sie beide durchsuchen und die Zahlen von
  Hand mit `tools/einbau.mjs` abgleichen. Das ist die Sorte Arbeit, bei der
  eine Zahl auseinanderläuft, ohne dass es jemand merkt.

  WOHER DIE ZAHLEN KOMMEN: aus der Einbauliste selbst (`EINBAU` in
  tools/einbau.mjs) — dieselbe Liste, gegen die eingebacken wird. Die
  Mindestbreite des Quellbildes ist die Rechnung, die dort auch die Sperre
  gegen Hochrechnen anstellt: Weltbreite mal zwei ist die Textur, und das
  Quellbild muss den Inhalt mindestens so breit tragen.

  WAS ES NICHT SAGT: ob ein geliefertes Bild gut ist. Dafuer
  `npm run bildpruefung` (misst) und der Blick (entscheidet).
*/
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { EINBAU } from './einbau.mjs';
import { messstelle } from './messstelle.mjs';

const M = messstelle('Bestellung', 'jede offene Bestellung nennt Format, Mindestgroesse und ihren Prompt.');

// Wo der Prompt steht. Der Bogen wird nicht geparst — er wird genannt.
// Ein Auszug hier waere eine zweite Fassung des Textes, und die zweite
// Fassung ist immer die veraltete.
const BOGEN = {
  boss4: ['docs/BILDAUFTRAEGE-BOSSE.md', 'B-4 · RINGFESTUNG'],
  boss5: ['docs/BILDAUFTRAEGE-BOSSE.md', 'B-5 · AMBOSSKREUZER'],
  e_elite: ['docs/BILDAUFTRAEGE-GEGNER.md', 'G-1 · ELITE-JÄGER'],
  e_carrier: ['docs/BILDAUFTRAEGE-GEGNER.md', 'G-2 · SCHLACHTTRÄGER'],
  e_rotor: ['docs/BILDAUFTRAEGE-GEGNER.md', 'G-3 · ROTOR-JÄGER'],
};

const offen = [], da = [];
for (const e of EINBAU) (existsSync(e.datei) ? da : offen).push(e);

// --- Den Block zum Kopieren herausschneiden --------------------------------
//
// Die beiden Auftragsboegen sind zusammen 1121 Zeilen. Wer EINE Bestellung
// absetzen will — und das soll man einzeln tun, fuenf auf einmal haben beim
// ersten Anlauf fuenf Mal denselben Fehler ergeben —, sucht die Stelle von
// Hand. Auf dem Telefon ist das keine Arbeit mehr, die jemand macht.
//
// Ausgeschnitten wird zur LAUFZEIT aus dem Bogen, nicht abgeschrieben. Ein
// Auszug im Werkzeug waere eine zweite Fassung des Textes, und die zweite
// Fassung ist immer die veraltete.
function block(schluessel) {
  const [datei, ueberschrift] = BOGEN[schluessel] || [];
  if (!datei || !existsSync(datei)) return null;
  const zeilen = readFileSync(datei, 'utf8').split('\n');
  // Die ERSTE Fundstelle: bei den Bossen steht der Block zum Kopieren vorn
  // (Abschnitt 1c) und die Beschreibung des Motivs hinten (Abschnitt 3).
  const anfang = zeilen.findIndex((z) => /^#{2,3} /.test(z) && z.includes(ueberschrift));
  if (anfang < 0) return null;
  const stufe = (zeilen[anfang].match(/^#+/) || ['##'])[0].length;
  let ende = zeilen.length;
  for (let i = anfang + 1; i < zeilen.length; i++) {
    const m = zeilen[i].match(/^(#+) /);
    if (m && m[1].length <= stufe) { ende = i; break; }
  }
  return zeilen.slice(anfang, ende).join('\n').trimEnd();
}

const WELCHER = (process.argv.find((a3) => a3.startsWith('--block=')) || '').slice(8);
if (WELCHER) {
  const liste = WELCHER === 'alle' ? offen.map((e) => e.schluessel) : [WELCHER];
  let raus = 0;
  for (const k of liste) {
    const e = EINBAU.find((x) => x.schluessel === k);
    const t = block(k);
    if (!e || !t) { M.befund(`kein Auftragsblock zu "${k}".`); continue; }
    console.log(`\n${'═'.repeat(72)}`);
    console.log(`Bestellung ${k}  →  ${e.datei}`);
    console.log(`Textur ${e.welt * 2} Punkte breit · Inhalt im Quellbild mindestens so breit`);
    console.log('═'.repeat(72) + '\n');
    console.log(t);
    raus++;
  }
  console.log(`\n${'═'.repeat(72)}`);
  console.log('Nach der Lieferung:  npm run bildpruefung   dann   npm run einbau');
  if (!raus) M.befund('kein einziger Block ausgegeben.');
  M.urteil(`${raus} Auftragsblock/-bloecke ausgegeben.`);
}

console.log(`Bestellung — ${EINBAU.length} Bilder im Auftrag, ${da.length} geliefert, ${offen.length} offen\n`);

if (da.length) {
  console.log('  Geliefert:');
  for (const e of da) console.log(`    ${e.schluessel.padEnd(14)} ${e.datei}`);
  console.log('');
}

if (!offen.length) console.log('  Nichts offen.');
else {
  console.log('  Offen — Mindestbreite ist die INHALTSbreite, nicht die Blattbreite:');
  for (const e of offen) {
    const [datei, ueberschrift] = BOGEN[e.schluessel] || ['—', '—'];
    console.log(`\n    ${e.schluessel}  →  ${e.datei}`);
    console.log(`      Textur ${e.welt * 2} Punkte breit (Weltbreite ${e.welt} mal zwei)`);
    console.log(`      Quellbild: Inhalt mindestens ${e.welt * 2} Punkte breit, besser das Doppelte`);
    console.log(`      Prompt:    ${datei}  →  ${ueberschrift}`);
    console.log(`      Zum Kopieren: npm run bestellung -- --block=${e.schluessel}`);
  }
}

// Und die verworfenen Lieferungen: sie liegen daneben, nicht im Auftrag.
const VERWORFEN = 'art/roh/boss/verworfen';
if (existsSync(VERWORFEN)) {
  const w = readdirSync(VERWORFEN).filter((f) => f.endsWith('.png'));
  if (w.length) {
    console.log(`\n  Schon einmal geliefert und abgelehnt (${VERWORFEN}):`);
    for (const f of w) console.log(`    ${f}  ${Math.round(statSync(`${VERWORFEN}/${f}`).size / 1024)} KB  — Grund im README daneben`);
  }
}

// ---- Traegt jeder Auftragsblock die zwei Regeln, die ein Tor prueft? -----
//
// DER ANLASS: die Farbbaender stehen seit jeher im Farbtor — rot-orange
// fuer Gegnerprojektile, weiss-cyan fuer Eigenfeuer — und standen bis v78
// in KEINEM der neun Bildauftraege. Der Rotor-Auftrag verlangte sogar
// ausdruecklich "a small red beacon on the spine", also genau das, was das
// Tor spaeter abgelehnt haette.
//
// Dasselbe fuer die Hoheitszeichen: in einer Lieferung standen zwei
// Hakenkreuze auf den Landeplattformen. Kein Werkzeug findet das im Bild —
// aber ob es im NEGATIVPROMPT steht, ist nachzaehlbar.
//
// Eine Regel, die ein Tor prueft, aber der Auftrag nicht nennt, wird
// geliefert und dann abgelehnt. Das kostet eine Runde je Bild.
// Die Gegenprobe zu dieser Pruefung: EINEM Block die Farbregel wegnehmen.
// Ein Tor, das nie etwas meldet, ist kein Beweis — und diese Pruefung ist
// gerade erst entstanden, hat also noch nie etwas gefunden ausser den fuenf
// Luecken, fuer die sie gebaut wurde.
const PROBE_OHNE_REGEL = process.argv.includes('--probe-ohne-regel');

console.log('\n  Regeln in den Auftragsbloecken');
const PFLICHT = [
  ['COLOUR RESTRICTION', 'die Farbbaender (rot-orange / weiss-cyan)'],
  ['swastika', 'das Hoheitszeichen-Verbot im Negativprompt'],
  ['alpha channel', 'der Alphakanal'],
];
let bloecke = 0;
for (const k of Object.keys(BOGEN)) {
  let t = block(k);
  if (!t) { M.befund(`kein Auftragsblock zu "${k}" — der Prompt ist nicht zu finden.`); continue; }
  bloecke++;
  if (PROBE_OHNE_REGEL && k === 'boss5') {
    // Kam der Eingriff an? Ein nicht angekommener Eingriff sieht aus wie
    // eine bestandene Probe — drei sind in diesem Projekt daran gescheitert.
    if (!/COLOUR RESTRICTION/i.test(t)) M.abbruch('die Gegenprobe ist nicht angekommen: boss5 traegt die Farbregel gar nicht.');
    t = t.replace(/COLOUR RESTRICTION/gi, 'colour note');
  }
  const fehlt = PFLICHT.filter(([n]) => !t.toLowerCase().includes(n.toLowerCase())).map(([, w]) => w);
  console.log(`    ${k.padEnd(14)} ${fehlt.length ? 'FEHLT: ' + fehlt.join(' · ') : 'vollstaendig'}`);
  for (const w of fehlt) M.befund(`Auftrag "${k}": ${w} fehlt im Block.`);
  // Und der Widerspruch, an dem der Rotor haengt: ein rotes Blinklicht im
  // POSITIVEN Prompt, waehrend das Farbtor Rot fuer die Gefahr reserviert.
  //
  // ERSTER ANLAUF WAR FALSCH und hat es sofort gezeigt: das Muster traf die
  // VERBOTSZEILE selbst ("no large glowing red or orange surface") und
  // meldete fuenf Befunde, die es nicht gab. Ein Tor, das seine eigene
  // Regel fuer einen Verstoss haelt, ist schlimmer als keines — es macht
  // den Bogen rot und lenkt von den echten Luecken ab.
  //
  // Deshalb wird die Verbotszeile vorher herausgeschnitten, und gesucht
  // wird nur nach dem, was ein Bild WIRKLICH rot machen wuerde.
  const positiv = (t.split('**Negativ:**')[0] || '')
    .replace(/COLOUR RESTRICTION[\s\S]*?(?:\n\n|$)/gi, '');
  const rot = positiv.match(/\b(red beacon|red light|red strip|red glow|red panel)\b/i);
  if (rot)
    M.befund(`Auftrag "${k}": der Prompt verlangt "${rot[1]}" am Schiff — das rot-orange Band gehoert den Gegnerprojektilen.`);
}
if (!bloecke) M.ungemessen('kein einziger Auftragsblock gelesen.');

// Ein Auftrag ohne Prompt ist keiner. Das ist die einzige Pruefung hier,
// und sie greift genau dann, wenn jemand die Einbauliste erweitert und den
// Bogen vergisst — der Fall, in dem eine Bestellung still verschwindet.
const ohne = offen.filter((e) => !BOGEN[e.schluessel]);
if (ohne.length)
  M.befund(`${ohne.length} offene Bestellung(en) ohne Prompt im Auftragsbogen: `
    + `${ohne.map((e) => e.schluessel).join(', ')}. Wer die Einbauliste erweitert, schreibt den Auftrag dazu.`);

M.urteil();

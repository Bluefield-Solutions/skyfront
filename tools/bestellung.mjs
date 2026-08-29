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

// Ein Auftrag ohne Prompt ist keiner. Das ist die einzige Pruefung hier,
// und sie greift genau dann, wenn jemand die Einbauliste erweitert und den
// Bogen vergisst — der Fall, in dem eine Bestellung still verschwindet.
const ohne = offen.filter((e) => !BOGEN[e.schluessel]);
if (ohne.length)
  M.befund(`${ohne.length} offene Bestellung(en) ohne Prompt im Auftragsbogen: `
    + `${ohne.map((e) => e.schluessel).join(', ')}. Wer die Einbauliste erweitert, schreibt den Auftrag dazu.`);

M.urteil();

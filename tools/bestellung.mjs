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
import { existsSync, readdirSync, statSync } from 'node:fs';
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

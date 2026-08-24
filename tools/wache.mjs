#!/usr/bin/env node
/*
  Wache — welche Stufe verlangt DIESE Aenderung?

    node tools/wache.mjs            gegen origin/main
    node tools/wache.mjs HEAD~3     gegen einen anderen Stand

  Der Anlass: die Gegenproben pruefen die TORE, liefen aber bei jeder
  SPIEL-Aenderung mit. Eine Aenderung am Wellengenerator kann nicht beweisen
  und nicht widerlegen, ob das Farbtor anschlaegt — sie kostete trotzdem
  fuenfzehn bis dreissig Minuten. Das war der groesste Einzelposten der
  ganzen Prueferei und bei reinen Spielaenderungen ohne jede Aussage.

  Umgekehrt gilt es genauso, und das ist der eigentliche Grund fuer diese
  Datei: wer ein Tor anfasst, MUSS die Gegenproben laufen lassen. Eine Regel,
  die nur aufgeschrieben ist, wird gebrochen — im Schwesterprojekt vier Mal
  dieselbe.

  Diese Wache urteilt nicht, sie sagt an. Was sie nennt, ist auszufuehren.
*/
import { execSync } from 'node:child_process';

const BASIS = process.argv[2] || 'origin/main';

let dateien;
try {
  dateien = execSync(`git diff --name-only ${BASIS}...HEAD`, { encoding: 'utf8' })
    .split('\n').map((x) => x.trim()).filter(Boolean);
} catch {
  console.log(`(—) Wache: ${BASIS} nicht erreichbar — es wird nichts angesagt.`);
  console.log('    Ohne Vergleichsstand kann diese Datei nichts wissen. Sie sagt es,');
  console.log('    statt "nichts noetig" zu melden: das waere eine Aussage ohne Messung.');
  process.exit(2);
}
// Auch das Unversionierte zaehlt — sonst sagt die Wache vor dem Einchecken
// das Gegenteil von dem, was nach dem Einchecken gilt.
const offen = execSync('git status --porcelain', { encoding: 'utf8' })
  .split('\n').map((z) => z.slice(3).trim()).filter(Boolean);
const alle = [...new Set([...dateien, ...offen])];

if (!alle.length) {
  console.log(`Wache: keine Aenderung gegen ${BASIS}.`);
  process.exit(0);
}

const tore = alle.filter((f) => f.startsWith('tools/') || f === 'check.mjs' || f === 'schnell.mjs');
const spiel = alle.filter((f) => f.startsWith('src/') || f.startsWith('profiles/') || f.endsWith('.html') || f.startsWith('build'));

console.log(`Wache — ${alle.length} Datei(en) gegen ${BASIS}\n`);
if (tore.length) console.log(`  Tore beruehrt:  ${tore.join(' ')}`);
if (spiel.length) console.log(`  Spiel beruehrt: ${spiel.slice(0, 8).join(' ')}${spiel.length > 8 ? ` … (+${spiel.length - 8})` : ''}`);

console.log('\nVerlangt wird:');
console.log('  · npm run schnell            beim Arbeiten (49 s)');
console.log('  · npm run check              vor dem Push (ohne Bildtor)');
if (tore.length) {
  console.log('  · npm run proben            PFLICHT — hier wurde ein Tor angefasst.');
  console.log('');
  console.log('    Ein geaendertes Tor ist nicht geprueft, nur weil es gruen meldet.');
  console.log('    Die Gegenproben bauen Fehler ein und verlangen, dass genau die');
  console.log('    zustaendige Pruefung anschlaegt. Zwei Pruefungen haben vier');
  console.log('    Versionen lang gruen gemeldet und dabei nichts geprueft — gefunden');
  console.log('    hat das keine Torkette, sondern eine Gegenprobe.');
} else {
  console.log('  · npm run proben            NICHT noetig — kein Tor angefasst.');
  console.log('');
  console.log('    Die Gegenproben pruefen die Tore, nicht das Spiel. Sie hier laufen');
  console.log('    zu lassen kostet 15 bis 30 Minuten und beweist nichts.');
}
process.exit(0);

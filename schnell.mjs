#!/usr/bin/env node
/*
  Die schnelle Runde — für JEDE Änderung, nicht für die Auslieferung.

  Die volle Torkette braucht rund fünf Minuten, davon 58 % allein das
  Bildtor. Bei einer Rückmeldeschleife von fünf Minuten arbeitet man anders
  als bei einer von vierzig Sekunden, und zwar schlechter: man sammelt
  Änderungen an, statt sie einzeln zu prüfen, und wenn dann etwas rot wird,
  sucht man in fünf Änderungen statt in einer.

  Diese Runde beantwortet die Fragen, die eine Änderung am wahrscheinlichsten
  kaputt macht:

      Baut es?               build.mjs
      Stimmt die Version?    tools/version.mjs
      Nummern eindeutig?     tools/nummern.mjs
      Startet alles?         build-variants.mjs --boot (elf Varianten)
      Farbbänder intakt?     tools/farbtor.mjs
      Silhouetten intakt?    tools/formen.mjs
      Untergrund intakt?     tools/untergrund.mjs
      Sektoren intakt?       tools/rhythmus.mjs

  Die vier Tore laufen PARALLEL — es sind eigenständige Prozesse, und
  gemessen kostet das siebenfach parallel 78 bis 86 s statt 109 s seriell.

  Was hier NICHT läuft: Bildtor (174 s), Feuerkraft (34 s), Speicher (19 s),
  Formationen (17 s). Die laufen in `npm run check` und in jedem Fall auf
  GitHub nach dem Push — dort kostet die Zeit niemanden Wartezeit.

  DAS IST KEINE ABKUERZUNG VOR DER AUSLIEFERUNG. Vor einem Push, der
  ausgeliefert wird, gilt weiterhin die volle Kette (oder das Vertrauen
  darauf, dass CI sie fährt und man das Ergebnis auch ansieht).
*/
import { execSync, exec } from 'node:child_process';
import { promisify } from 'node:util';
const laufen = promisify(exec);

const t0 = Date.now();
const schritt = (name, cmd) => {
  console.log(`\n▶ ${name}`);
  execSync(cmd, { stdio: 'inherit' });
};

try {
  schritt('Build (Master)', 'node build.mjs');
  schritt('Version (Quelle, Bericht, Bau)', 'node tools/version.mjs');
  schritt('Nummern (keine Doppelbelegung)', 'node tools/nummern.mjs');
  schritt('Build + Boot-Test aller Varianten', 'node build-variants.mjs --boot');
} catch {
  console.error('\n✗ SCHNELL fehlgeschlagen — es baut oder startet nicht.');
  process.exit(1);
}

const TORE = [
  ['Farbtor', 'node tools/farbtor.mjs'],
  ['Formentor', 'node tools/formen.mjs'],
  ['Untergrund', 'node tools/untergrund.mjs'],
  ['Rhythmus', 'node tools/rhythmus.mjs'],
];

console.log(`\n▶ ${TORE.length} Tore parallel …`);
const ergebnisse = await Promise.all(TORE.map(async ([name, cmd]) => {
  const s = Date.now();
  try {
    const { stdout } = await laufen(cmd, { maxBuffer: 32 * 1024 * 1024 });
    return { name, code: 0, s: (Date.now() - s) / 1000, text: stdout };
  } catch (e) {
    // 2 heisst "nicht (vollstaendig) gemessen" — kein Mangel am Spiel.
    return { name, code: e.code === 2 ? 2 : 1, s: (Date.now() - s) / 1000,
      text: (e.stdout || '') + (e.stderr || '') };
  }
}));

let rot = 0;
for (const r of ergebnisse) {
  const marke = r.code === 0 ? '✓' : r.code === 2 ? '⚠' : '✗';
  console.log(`  ${marke} ${r.name.padEnd(12)} ${r.s.toFixed(0).padStart(3)} s`);
  if (r.code === 1) {
    rot++;
    // Nur die Befundzeilen, nicht der ganze Bericht — wer mehr will, ruft
    // das Tor einzeln auf.
    for (const z of r.text.split('\n'))
      if (/^\s*[·✗]\s/.test(z) || /ROT|fehlgeschlagen/.test(z)) console.log('      ' + z.trim());
  }
}

const dauer = ((Date.now() - t0) / 1000).toFixed(0);
if (rot) {
  console.error(`\n✗ SCHNELL: ${rot} Tor(e) mit Befund — ${dauer} s`);
  process.exit(1);
}
console.log(`\n✓ SCHNELL bestanden — ${dauer} s.`);
console.log('  Nicht geprüft: Bildtor, Feuerkraft, Speicher, Formationen.');
console.log('  Vor der Auslieferung: npm run check (oder CI ansehen).');

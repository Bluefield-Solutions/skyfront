#!/usr/bin/env node
/*
  Gegenproben zum Farbtor.

  Ein Tor, das nie etwas meldet, ist kein Beweis. Jede Probe hier baut EINEN
  Fehler ein und verlangt, dass genau die dafuer zustaendige Pruefung
  anschlaegt — und sie prueft zuerst, ob der Eingriff ueberhaupt angekommen
  ist. Ein nicht angekommener Eingriff sieht aus wie ein bestandenes Tor.

    node tools/farbproben.mjs            nur die statischen Proben (A bis E)
    node tools/farbproben.mjs --alle     zusaetzlich F, mit Neubau (~4 min)

  Es wird nie mit `git checkout` gearbeitet: die Dateien werden vorher
  kopiert und danach aus der Kopie zurueckgeschrieben. Frische, noch nicht
  eingecheckte Arbeit ueberlebt einen Abbruch damit auch.
*/
import { readFileSync, writeFileSync, existsSync, copyFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ALLE = process.argv.includes('--alle');
const APP = 'src/app.js';
const SICHER = 'src/app.js.probe';

// [Name, zustaendige Pruefung, Ersetzung alt -> neu, braucht Neubau]
const PROBEN = [
  ['alte Gegnerfarbe zurueck (eb_bolt cyan)', 'B',
    ['zs(R, E, b, GEFAHR)', 'zs(R, E, b, "#37e0ff")'], false],
  ['Aufsammler ins Gefahrenband', 'B',
    ['oe(R, E, b, "#ffc21f", "B")', 'oe(R, E, b, "#ff4128", "B")'], false],
  ['Spielerfarbe auf einen Gegnerwert', 'A',
    ['EIGEN = "#bfefff"', 'EIGEN = "#ff3a2a"'], false],
  // Beide Werte zugleich: sonst schlaegt zuerst die Gleichlaufpruefung an
  // (EIGEN und EIGEN_N auseinandergelaufen) und C kaeme gar nicht dran.
  ['Spielerfarbe dunkel', 'C',
    ['EIGEN = "#bfefff",\n    EIGEN_N = 12578815,', 'EIGEN = "#337537",\n    EIGEN_N = 3372343,'], false],
  ['dunkler Rand am Spielergeschoss entfernt', 'E',
    ['T.fillStyle = "#0a0f18", form(), T.fill()', 'T.fillStyle = "#cfe4ff", form(), T.fill()'], false],
  ['Spielergeschosse wieder additiv', 'E',
    ['BlendModes.NORMAL).setScale(I * this.bulletScaleMul)', 'BlendModes.ADD).setScale(I * this.bulletScaleMul)'], false],
  ['weisses Mittelband auf eb_needle', 'F',
    ['v.addColorStop(0, b), v.addColorStop(.44, b), v.addColorStop(.55, "#ffd2c4"), v.addColorStop(.68, b), v.addColorStop(1, b)',
      'v.addColorStop(0, b), v.addColorStop(.5, "#ffffff"), v.addColorStop(1, b)'], true],
];

if (!existsSync(APP)) { console.error('✗ src/app.js fehlt'); process.exit(1); }
copyFileSync(APP, SICHER);
const zurueck = () => copyFileSync(SICHER, APP);
process.on('exit', () => { if (existsSync(SICHER)) { zurueck(); unlinkSync(SICHER); } });

const torLauf = (statisch) => {
  try {
    execFileSync('node', ['tools/farbtor.mjs', ...(statisch ? ['--nurstatisch'] : [])],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { rot: false, text: '' };
  } catch (e) {
    return { rot: true, text: (e.stdout || '') + (e.stderr || '') };
  }
};

// Grundlinie: ohne Eingriff muss das Tor gruen sein, sonst misst hier nichts.
console.log('Grundlinie …');
const grund = torLauf(!ALLE);
if (grund.rot) {
  console.error('✗ Das Farbtor ist schon ohne Eingriff rot. Erst das in Ordnung bringen.');
  console.error(grund.text.split('\n').filter((z) => z.includes('·')).join('\n'));
  process.exit(1);
}
console.log('  grün, wie erwartet.\n');

let fehler = 0, gelaufen = 0;
for (const [name, pruefung, [alt, neu], neubau] of PROBEN) {
  if (neubau && !ALLE) { console.log(`(—) ${name} — braucht Neubau, mit --alle`); continue; }
  const roh = readFileSync(SICHER, 'utf8');
  const n = roh.split(alt).length - 1;
  if (n !== 1) {
    console.log(`✗ ${name}: Eingriff NICHT ANGEKOMMEN — Stelle ${n}x gefunden, 1x erwartet`);
    fehler++; continue;
  }
  writeFileSync(APP, roh.replace(alt, neu));
  if (neubau) execFileSync('node', ['build.mjs'], { stdio: 'ignore' });
  const r = torLauf(!neubau);
  gelaufen++;
  if (!r.rot) { console.log(`✗ ${name}: Tor blieb GRÜN — Prüfung ${pruefung} greift nicht`); fehler++; }
  else if (!new RegExp(`^\\s*· ${pruefung}:`, 'm').test(r.text)) {
    const zeilen = r.text.split('\n').filter((z) => z.trim().startsWith('·')).join(' | ');
    console.log(`✗ ${name}: rot, aber nicht durch ${pruefung} — ${zeilen}`);
    fehler++;
  } else {
    const zeile = r.text.split('\n').find((z) => z.trim().startsWith('· ' + pruefung + ':')).trim();
    console.log(`✓ ${name} → ${pruefung} schlägt an`);
    console.log(`    ${zeile.slice(2)}`);
  }
  zurueck();
  if (neubau) execFileSync('node', ['build.mjs'], { stdio: 'ignore' });
}

console.log(`\n${gelaufen} Probe(n) gelaufen, ${fehler} ohne Wirkung.`);
process.exit(fehler ? 1 : 0);

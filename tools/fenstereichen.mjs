#!/usr/bin/env node
/*
  Fenstereichen — was kostet ein kleinerer Wellenabstand?

    node tools/fenstereichen.mjs [--werte=1150,1000,950,900,850]

  DER ANLASS (SKY-243): Bossstufe 4 und 5 passen nicht ans Ende der
  Kampagne. Nicht weil ihr Bild fehlt, sondern weil das Wellenfenster im
  hundertzwanzigsten Sektor auf 95,7 s waechst und unter der Obergrenze
  von 160 s nur noch 64 s fuer den Boss uebrig laesst — das ist Stufe 3.

  DIE STELLSCHRAUBE ist `curve.spacingFloor`: der kleinste Wellenabstand.
  Ab Sektor 25 ist er der EINZIGE, der noch wirkt (spacingBase minus
  Sektor mal spacingSlope liegt dort schon darunter), und bis v39 stand er
  als nacktes Literal in app.js.

  WARUM EIN EICHLAUF und nicht einfach ein neuer Wert: blind nachjustieren
  heisst durch ein Schluesselloch schauen. Ein kleinerer Abstand macht das
  Spaetspiel kuerzer UND dichter — mehr Gegner zugleich auf dem Schirm.
  Wieviel kuerzer, laesst sich rechnen; wieviel dichter, sieht man hier
  wenigstens an der Zahl der Wellen je Minute.

  GEMESSEN WIRD MIT DEM TOR SELBST: je Wert wird gebaut und
  `tools/zeitachse.mjs --json` gefragt. Es gibt hier keine zweite,
  nachgebaute Formel (eiserne Regel 4). Der Preis ist die Laufzeit:
  rund eine Minute je Wert.

  DIE MESSSTELLE: dist/Skyfront.html, Chromium unter SwiftShader,
  390 x 844. Angenommen sind volle Feuerkraft und dass jeder Schuss
  trifft — dieselbe Annahme wie in der Zeitachse. Alle Sekundenzahlen
  sind Untergrenzen, keine Spielzeit.
*/
import { readFileSync, writeFileSync, copyFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const BAL = 'src/balance.js', SICHER = 'src/balance.js.eich';
const arg = process.argv.find((a) => a.startsWith('--werte='));
const WERTE = (arg ? arg.slice(8) : '1150,1000,950,900,850').split(',').map(Number);
const OBEN = 160;   // dieselbe Obergrenze wie in tools/zeitachse.mjs

if (existsSync(SICHER)) {
  console.error(`✗ ${SICHER} liegt schon da — entweder laeuft ein zweiter Eichlauf,`);
  console.error('  oder einer ist abgestuerzt. Von Hand pruefen und zuruecklegen.');
  process.exit(1);
}
copyFileSync(BAL, SICHER);
process.on('exit', () => { if (existsSync(SICHER)) { copyFileSync(SICHER, BAL); unlinkSync(SICHER); } });

const setzen = (wert) => {
  const roh = readFileSync(SICHER, 'utf8');
  const re = /(spacingFloor:\s*)(\d+)/;
  if (!re.test(roh)) { console.error('✗ spacingFloor steht nicht in src/balance.js'); process.exit(1); }
  writeFileSync(BAL, roh.replace(re, `$1${wert}`));
};

const messen = () => {
  execFileSync('node', ['build.mjs'], { stdio: 'ignore' });
  const aus = execFileSync('node', ['tools/zeitachse.mjs', '--json'], { encoding: 'utf8', maxBuffer: 1 << 24 });
  return JSON.parse(aus.trim().split('\n').pop());
};

console.log('Fenstereichen — kleinster Wellenabstand (curve.spacingFloor)\n');
console.log('  Messstelle: dist/Skyfront.html in Chromium (SwiftShader), 390 x 844.');
console.log('  Untergrenzen bei voller Feuerkraft, jeder Schuss trifft — keine Spielzeit.\n');

const reihen = [];
for (const wert of WERTE) {
  setzen(wert);
  const d = messen();
  const z = Object.fromEntries(d.zeilen.map((r) => [r.nr, r]));
  const letzter = d.zeilen[d.zeilen.length - 1].nr;
  const g = d.zeilen.map((r) => r.gesamt).sort((a, b) => a - b);
  // Bis zu welchem Sektor traegt welche Bossstufe noch, ohne die
  // Obergrenze zu reissen? Das Bossleben kommt aus dem Modell, das die
  // Zeitachse mitgeliefert hat — nicht aus einer Formel von hier.
  const passt = (stufe) => {
    const m = d.modell.find((x) => x.stufe === stufe);
    const hp = (nr) => m.erst + (m.letzt - m.erst) * (nr - 1) / (letzter - 1);
    const ok = d.zeilen.filter((r) => r.fenster + hp(r.nr) / d.dps <= OBEN).map((r) => r.nr);
    return ok.length ? Math.max(...ok) : 0;
  };
  reihen.push({
    wert, f1: z[1].fenster, f60: z[60].fenster, f120: z[letzter].fenster,
    wellenJeMin: z[letzter].wellen / (z[letzter].fenster / 60),
    kurz: g[0], median: g[Math.floor(g.length / 2)], lang: g[g.length - 1],
    s4: passt(4), s5: passt(5),
  });
  const r = reihen[reihen.length - 1];
  console.log(`  ${String(wert).padStart(5)} ms  Fenster ${r.f1.toFixed(1)} / ${r.f60.toFixed(1)} / ${r.f120.toFixed(1)} s  `
    + `Sektor ${r.kurz.toFixed(1)}–${r.lang.toFixed(1)} s (Median ${r.median.toFixed(1)})  `
    + `Stufe 4 bis ${r.s4}, Stufe 5 bis ${r.s5}`);
}

console.log('\n  Abstand   Fenster S1 / S60 / S120   Wellen/min S120   kuerzester   Median   laengster   Stufe 4 bis   Stufe 5 bis');
for (const r of reihen)
  console.log(`  ${String(r.wert).padStart(5)} ms   `
    + `${r.f1.toFixed(1).padStart(6)} ${r.f60.toFixed(1).padStart(6)} ${r.f120.toFixed(1).padStart(7)} s   `
    + `${r.wellenJeMin.toFixed(1).padStart(13)}   ${r.kurz.toFixed(1).padStart(7)} s ${r.median.toFixed(1).padStart(7)} s ${r.lang.toFixed(1).padStart(9)} s   `
    + `${String(r.s4).padStart(10)}    ${String(r.s5).padStart(10)}`);

console.log('\n  Was die letzten zwei Spalten heissen: bis zu welchem Sektor ein Boss');
console.log(`  dieser Stufe unter der Obergrenze von ${OBEN} s bleibt. Nur wo beide auf`);
console.log('  dem letzten Sektor stehen, ist die Kampagne fuer fuenf Stufen offen.');

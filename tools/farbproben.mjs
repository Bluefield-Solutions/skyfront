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

// [Name, zustaendige Pruefung, Ersetzung alt -> neu, braucht Neubau, Tor, erwartet]
// Tor: 'farb' (Vorgabe) oder 'form'. Die Formproben brauchen immer einen
// Neubau, weil das Formentor die Textur des gebauten Spiels ausmisst.
//
// `erwartet` ist ein Textstueck, das im Befund vorkommen MUSS. Ohne das
// prueft eine Probe an einem '✗'-Tor nur, DASS es rot wird — nicht, WORAN.
// Das ist keine Kleinigkeit: die Probe „Keil ohne Staffelung" machte die
// Formationentafel rot und meldete dabei „Deckung und Eskorte", also ein
// Paar, das der Eingriff gar nicht betraf. Sie haette als bestanden
// gezaehlt und nichts bewiesen. Dasselbe bei „Bausteine duerfen sich
// wiederholen": rot ueber die Atemzug-Pruefung, gedacht war die Vielfalt.
// Fuer die Farbtor-Proben leistet das die Pruefungskennung (A, B, H, …);
// die Tafeln mit '✗' brauchen dieses Feld.
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
  // Die Raute wieder zur eingeschriebenen Scheibe: dann ist sie flaechen-
  // UND profilgleich mit eb_orb, und genau das soll das Formentor melden.
  // Die Beruhigungsschicht auf Schwarz statt Mittelfarbe: dann DUNKELT sie ab
  // statt Kontrast zu nehmen, und genau das soll die Untergrund-Tafel melden.
  ['Beruhigungsschicht auf Schwarz', '✗', [
    'farbe: Math.round(x / r) << 16 | Math.round(t / r) << 8 | Math.round(l / r),',
    'farbe: 0,'], true, 'boden', 'die Schicht verschiebt die Mittelhelligkeit'],
  // Die Leiter zu frueh oben: dann belohnt der Rest des Sektors nichts mehr.
  ['Feuerkraft-Leiter nach einem Zehntel voll', '✗', [
    'PWR_ANTEIL = .55,', 'PWR_ANTEIL = .09,'], true, 'kraft', 'volle Stufe schon nach'],
  // Und die Mechanik selbst ausbauen: der Treffer kostet nichts mehr.
  ['Treffer kostet keine Feuerkraft', '✗', [
    'this.powerLevel = Math.max(this.powerFloor, this.powerLevel - PWR_JE_TREFFER)',
    'this.powerLevel = this.powerLevel'], true, 'kraft', 'Treffer kostet keine Stufe'],
  // Der Spaeher zurueck auf seine alte Groesse: dann ist er wieder kleiner
  // als jedes Geschoss im Spiel, und die Mindestgroesse muss anschlagen.
  // Die neun Verlaufskulissen wieder beim Start anlegen: 9,99 MB, die
  // niemand braucht — und genau das soll die Speicher-Tafel melden.
  // Die Druckkurve flach ziehen: dann gibt es keine Atemzuege mehr, und der
  // Sektor ist wieder eine Rampe statt einer Form.
  ['Druckkurve ohne Atemzuege', '✗', [
    'return E * (.35 + .65 * T) * (1 - .45 * (b(.34) + b(.67)))',
    'return E * (.35 + .65 * T)'], true, 'rhythmus', 'Atemzug'],
  // Und die Wiederholungssperre ausbauen: dann waehlt die Kurve auf ihrem
  // flachen Stueck immer denselben Baustein.
  // Die Wiederholungssperre ausbauen: dann waehlt die Kurve auf ihrem flachen
  // Stueck immer denselben Baustein — 21x je Sektor, gemessen.
  ['Bausteine duerfen sich wiederholen', '✗', [
    'if (o === t || o === l) continue;', ''], true, 'rhythmus', 'unmittelbar hintereinander'],
  // Und die Auswahl auf vier der zwoelf Bausteine beschraenken: das trifft
  // die Vielfalt-Pruefung, die vorher wirkungslos war, weil sie ihr
  // Druckband aus der beurteilten Folge selbst nahm.
  ['Auswahl auf vier Bausteine beschraenkt', '✗', [
    'for (let o = 0; o < Bausteine.length; o++) {',
    'for (let o = 0; o < Bausteine.length; o++) {\n        if (o > 3) continue;'], true, 'rhythmus', 'nutzt nur'],
  ['Verlaufskulissen wieder auf Vorrat', '✗', [
    'ht(T, "bg_ocean", 540, 540, (R, E) => gi(R, E, pi.bg_ocean));',
    'for (const [R, E] of Object.entries(pi)) ht(T, R, 540, 540, (b, I) => gi(b, I, E));'], true, 'speicher', 'Verlaufskulissen liegen im Speicher'],
  ['Spaeher zurueck auf 17 Punkte Flaeche', '✗', [
    'scale: .46,\n      hitScale: .22,', 'scale: .22,'], true, 'form', 'Gegner scout hat'],
  // ---- die Kennleuchten der Gegner --------------------------------------
  // Der alte Violettwert zurueck: 36 Grad und 5 Graustufen von pu_core, also
  // im Bild derselbe Punkt. Genau dafuer ist H da.
  ['alter Violettwert der Kennleuchte zurueck', 'H',
    ['schuetze: "#a88cff"', 'schuetze: "#8a6cff"'], false],
  // Eine Kennleuchte im Gefahrenband: dann liest sich der Fluegel als
  // Geschoss, und das ist schlimmer als gar keine Leuchte.
  ['Kennleuchte ins Gefahrenband', 'H',
    ['stuerzer: "#93f562"', 'stuerzer: "#ff5a3a"'], false],
  // Eine Kennleuchte, die nicht leuchtet: auf dunklem Rumpf und dunklem
  // Saum ist sie dann gar nicht da.
  ['Kennleuchte zu dunkel', 'H',
    ['stuerzer: "#93f562"', 'stuerzer: "#1f3d12"'], false],
  // Beide Rollen auf dieselbe Farbe: dann sagt die Leuchte nichts mehr.
  ['beide Kennleuchten gleich', 'H',
    ['schuetze: "#a88cff"', 'schuetze: "#93f562"'], false],
  // Und die Leuchte auf Aufsammlergroesse aufblasen: dann traegt der
  // Farbton die Trennung allein, und dafuer ist der Kreis zu voll.
  ['Kennleuchte auf Aufsammlergroesse', 'H2',
    ['LEUCHTE_PUNKTE = 2.4,', 'LEUCHTE_PUNKTE = 24,'], true],
  // ---- die zwoelf Begegnungsbausteine -----------------------------------
  // Die Eskorte auf die Deckung setzen: dann sind es elf Ideen mit zwoelf
  // Namen, und die Formationentafel muss das sehen.
  ['Eskorte ist die Deckung noch einmal', '✗', [
    'teile: [{ rolle: "panzer", n: 1, form: "single", nach: 0 }, { rolle: "schuetze", n: 2, form: "column", nach: 400 }, { rolle: "schwarm", n: 4, form: "row", nach: 900 }]',
    'teile: [{ rolle: "panzer", n: 1, form: "single", nach: 0 }, { rolle: "schwarm", n: 5, form: "row", nach: 900 }]'], true, 'formation', 'Deckung und Eskorte'],
  // Und die Staffelung aus dem Keil nehmen: dann ist er eine Reihe, und die
  // Tafel muss ihn neben den Aufmarsch legen.
  ['Keil ohne Staffelung', '✗', [
    'this.spawnAt(R.kind, tt.Math.Clamp(v, E, J - E), Math.abs(G - I) * 46)',
    'this.spawnAt(R.kind, tt.Math.Clamp(v, E, J - E), 0)'], true, 'formation', 'Aufmarsch und Keil'],
  ['eb_diamond zurueck zur Scheibenform', '✗', [
    'T.beginPath(), T.moveTo(I, E * .02 - t), T.lineTo(I + R * .19 + t, G), T.lineTo(I, E * .98 + t), T.lineTo(I - R * .19 - t, G), T.closePath()',
    'T.beginPath(), T.arc(I, G, R * .3 + t, 0, 7), T.closePath()'], true, 'form'],
];

if (!existsSync(APP)) { console.error('✗ src/app.js fehlt'); process.exit(1); }
copyFileSync(APP, SICHER);
const zurueck = () => copyFileSync(SICHER, APP);
process.on('exit', () => { if (existsSync(SICHER)) { zurueck(); unlinkSync(SICHER); } });

const torLauf = (statisch, tor = 'farb') => {
  const cmd = tor === 'form' ? ['tools/formen.mjs']
    : tor === 'boden' ? ['tools/untergrund.mjs']
    : tor === 'kraft' ? ['tools/feuerkraft.mjs']
    : tor === 'speicher' ? ['tools/speicher.mjs']
    : tor === 'rhythmus' ? ['tools/rhythmus.mjs']
    : tor === 'formation' ? ['tools/formationen.mjs']
    : ['tools/farbtor.mjs', ...(statisch ? ['--nurstatisch'] : [])];
  try {
    execFileSync('node', cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { rot: false, text: '' };
  } catch (e) {
    return { rot: true, text: (e.stdout || '') + (e.stderr || '') };
  }
};

// Grundlinie: ohne Eingriff muss das Tor gruen sein, sonst misst hier nichts.
console.log('Grundlinie …');
for (const [tor, name] of ALLE ? [['farb', 'Farbtor'], ['form', 'Formentor'], ['boden', 'Untergrund-Tafel'], ['kraft', 'Feuerkraft'], ['speicher', 'Speicher-Tafel'], ['rhythmus', 'Rhythmus-Tafel'], ['formation', 'Formationentafel']] : [['farb', 'Farbtor']]) {
  const grund = torLauf(!ALLE, tor);
  if (grund.rot) {
    console.error(`✗ Das ${name} ist schon ohne Eingriff rot. Erst das in Ordnung bringen.`);
    console.error(grund.text.split('\n').filter((z) => z.includes('·') || z.includes('✗')).join('\n'));
    process.exit(1);
  }
  console.log(`  ${name} grün, wie erwartet.`);
}
console.log('');

let fehler = 0, gelaufen = 0;
for (const [name, pruefung, [alt, neu], neubau, tor = 'farb', erwartet] of PROBEN) {
  if (neubau && !ALLE) { console.log(`(—) ${name} — braucht Neubau, mit --alle`); continue; }
  const roh = readFileSync(SICHER, 'utf8');
  const n = roh.split(alt).length - 1;
  if (n !== 1) {
    console.log(`✗ ${name}: Eingriff NICHT ANGEKOMMEN — Stelle ${n}x gefunden, 1x erwartet`);
    fehler++; continue;
  }
  writeFileSync(APP, roh.replace(alt, neu));
  if (neubau) execFileSync('node', ['build.mjs'], { stdio: 'ignore' });
  const r = torLauf(!neubau, tor);
  gelaufen++;
  if (!r.rot) { console.log(`✗ ${name}: Tor blieb GRÜN — Prüfung ${pruefung} greift nicht`); fehler++; }
  else if (pruefung !== '✗' && !new RegExp(`^\\s*· ${pruefung}:`, 'm').test(r.text)) {
    const zeilen = r.text.split('\n').filter((z) => z.trim().startsWith('·')).join(' | ');
    console.log(`✗ ${name}: rot, aber nicht durch ${pruefung} — ${zeilen}`);
    fehler++;
  } else if (erwartet && !r.text.includes(erwartet)) {
    const zeilen = r.text.split('\n').filter((z) => z.trim().startsWith('·') || z.trim().startsWith('✗ ')).join(' | ');
    console.log(`✗ ${name}: rot, aber „${erwartet}" kommt im Befund nicht vor — ${zeilen}`);
    fehler++;
  } else {
    const torName = { farb: 'Farbtor', form: 'Formentor', boden: 'Untergrund-Tafel', kraft: 'Feuerkraft', speicher: 'Speicher-Tafel', rhythmus: 'Rhythmus-Tafel', formation: 'Formationentafel' }[tor];
    // Farbtor und Untergrund-Tafel melden mit "· ", das Formentor mit "✗ ".
    // Gezeigt wird die Zeile, die die ERWARTUNG erfuellt hat — nicht die
    // erste beste. Sonst steht im Protokoll ein Befund, der mit dem
    // Eingriff nichts zu tun hat, und das liest sich wie ein Beweis.
    const zeile = (r.text.split('\n').find((z) => {
      const x = z.trim();
      if (erwartet && !x.includes(erwartet)) return false;
      return pruefung === '✗' ? (x.startsWith('✗ ') || x.startsWith('· ')) : x.startsWith('· ' + pruefung + ':');
    }) || '').trim();
    console.log(`✓ ${name} → ${pruefung === '✗' ? torName : pruefung} schlägt an`);
    console.log(`    ${zeile.replace(/^[✗·]\s*/, '') || '(Tor rot, keine Einzelzeile)'}`);
  }
  zurueck();
  if (neubau) execFileSync('node', ['build.mjs'], { stdio: 'ignore' });
}

console.log(`\n${gelaufen} Probe(n) gelaufen, ${fehler} ohne Wirkung.`);
process.exit(fehler ? 1 : 0);

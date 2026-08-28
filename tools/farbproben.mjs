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
// Nur die Modusproben. Sie brauchen keinen Eingriff in src/app.js und
// keinen Neubau — nur den gebauten Stand. Damit lassen sie sich in einer
// Minute pruefen statt in dreissig, und genau deshalb werden sie auch
// gelaufen und nicht nur aufgeschrieben.
const NUR_MODUS = process.argv.includes('--nurmodus');
// Die beiden Bildtor-Modusproben starten je einen vollen Bildtor-Lauf und
// machen allein 174 der 230 gemessenen Sekunden aus. `--ohnebild` laesst
// sie weg: die sechs uebrigen kosten dann zusammen 56 s und sind damit
// billig genug, um bei jedem Lauf mitzukommen.
const OHNE_BILD = process.argv.includes('--ohnebild');
// --nur=<Text>: nur die Proben laufen lassen, deren Name den Text enthaelt.
//
// Der ganze Satz dauert zehn Minuten. Wer EINE Probe nachziehen will, hat
// bisher entweder zehn Minuten gewartet oder den Lauf in den Hintergrund
// geschoben — und genau das hat in v36 die frische Arbeit geloescht, weil
// der Lauf src/app.js zurueckschreibt. Ein Filter ist die einfachere
// Antwort als Disziplin.
const NUR = (process.argv.find((a) => a.startsWith('--nur=')) || '').slice(6).toLowerCase();
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
  // Der Bildboden. Ohne ihn konnte die Aufloesung unbemerkt SCHLECHTER
  // werden: die Tabelle im Formentor war bis v19 blosse Meldung, und der
  // Hinweis darunter uebernahm das kleinere Bild klaglos als neues Soll
  // ("elite 42 px → mindestens 113 px"). Ein kleineres Quellbild
  // untergeschoben — das ist genau der Fall, den kein Tor sah.
  ['elite bekommt das Bild des Spaehers (kleineres Quellbild)', '✗',
    ['e_elite: __SKFA[22]', 'e_elite: __SKFA[28]'], true, 'form',
    'Quellbild auf 42 px geschrumpft, Boden ist 80 px'],
  // Der Cache-Vertrag. Bis v23 merkte sich untergrundRuhe auch eine Messung
  // an einer Textur, die es noch gar nicht gab — bodenMessung(null) liefert
  // Nullen, und die blieben fuer den ganzen Lauf stehen. Betroffen waren
  // Beruhigungsschicht UND Schattenstaerke. Aufgefallen ist es an einer
  // anderen Baustelle; gemeldet hat es kein Tor.
  ['untergrundRuhe merkt sich wieder den Zwischenstand', '✗',
    ['if (!this.textures.exists(R)) return bodenMessung(null);\n        const b = this.textures.get(R).getSourceImage();\n        if (!b || !b.width) return bodenMessung(null);\n        return this.ruheCache[R] = bodenMessung(b)',
     'const b = this.textures.exists(R) ? this.textures.get(R).getSourceImage() : null;\n        return this.ruheCache[R] = bodenMessung(b)'],
    true, 'boden', 'merkt sich eine Messung an fehlender Textur'],
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
  // Den Kern der Leuchte dunkel mischen: dann loest sie sich nicht mehr vom
  // dunklen Rumpf, und sie ist im Bild nicht zu finden. Gemessen traegt sie
  // ueber 15:1 gegen den Saum — DAS ist die Messstelle, nicht der
  // Biom-Untergrund (dort kommt Violett auf Frost nur auf 1,34:1 und ist
  // trotzdem tadellos zu sehen).
  ['Kern der Kennleuchte dunkel gemischt', 'H',
    ['m.addColorStop(0, heller(r, .75))', 'm.addColorStop(0, heller(r, .02))'], false],
  // Und das andere Ende: ein fast weisser Kern frisst die Kennfarbe auf.
  // Genau der Fehler von eb_needle, und beim ersten Anlauf der Leuchte noch
  // einmal — damals nur am Kontaktbogen gesehen, von keiner Zahl.
  ['Kern der Kennleuchte fast weiss', 'H',
    ['m.addColorStop(0, heller(r, .75))', 'm.addColorStop(0, heller(r, .96))'], false],
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
  // Die Bosskurve wieder flach: dann hat der Boss im zwoelften Kapitel
  // genauso viel Leben wie im ersten. Genau der Zustand, den die Zeitachse
  // beim ersten Lauf vorfand (Stufe 3: Faktor 1,00 ueber 110 Sektoren) und
  // den bis dahin kein Tor gesehen hat.
  // Der Eingriff haengt sich HINTER das Literal, statt es zu ersetzen:
  // buildcore.mjs sucht beim Bauen genau diesen Ausdruck und wuerde sonst
  // mit "Kurven-Fragment nicht eindeutig" abbrechen — die Probe waere dann
  // am Bau gescheitert, nicht am Tor, und haette nichts bewiesen.
  ['Bosskurve flach — kein Zuwachs ueber die Sektoren', '✗',
    ['const h = 1450 * (1 + (sektor - 1) * .0125) * (stufe', 'const h = 1450 * (1 + (sektor - 1) * .0125) * 0 + 1450 * (stufe'],
    true, 'zeit', 'waechst ueber die ganze Kampagne nur um das'],
  // Die Wellenzahl zurueck auf den Stand vor v31: dann fallen die ersten
  // Sektoren wieder unter eine Minute. Das ist die andere Haelfte dessen,
  // was die Zeitachse misst — ohne diese Probe belegte sie nur die Bosse.
  ['nur noch halb so viele Wellen je Sektor', '✗',
    ['E.length < I && a < 400', 'E.length < Math.round(I * .55) && a < 400'],
    true, 'zeit', 'bleiben unter 60 s'],
  // Die Kampagne stehenbleiben lassen — beide Haelften einzeln.
  //
  // Bis v38 trugen die Kapitel VII bis XI FUENF MAL dieselbe Bossreihe, und
  // kein Tor hat es gemeldet: die Zeitachse sah nur Laenge und Bosswerte,
  // und beide waren in Ordnung. Die zwei Pruefungen, die es seit v39 sehen,
  // brauchen je eine Probe — sonst bezeugen sie nur den Zustand, den sie
  // vorgefunden haben.
  //
  // Ein einziges Feld genuegt fuer beide Faelle, und der Anker ist das
  // Hintergrundbild: "bg_lava_07" kommt genau einmal vor, "boss: 2," allein
  // kaeme 39 Mal. Ohne den Anker waere der Eingriff nicht angekommen, und
  // ein nicht angekommener Eingriff sieht aus wie ein bestandenes Tor.
  ['Kapitel XI wiederholt Kapitel XII Zeichen fuer Zeichen', '✗', [
    'bg: "bg_lava_07",\n      sky: 3805702,\n      skyAlpha: .14,\n      cloud: .15,\n      boss: 2,',
    'bg: "bg_lava_07",\n      sky: 3805702,\n      skyAlpha: .14,\n      cloud: .15,\n      boss: 3,'],
    true, 'zeit', 'wiederholen die Bossreihe'],
  // Und die andere Haelfte: das letzte Kapitel schwaecher als das vorletzte.
  ['letztes Kapitel faellt hinter das vorletzte zurueck', '✗', [
    'bg: "bg_biolum_01",\n      sky: 656664,\n      skyAlpha: .16,\n      cloud: .14,\n      boss: 3,',
    'bg: "bg_biolum_01",\n      sky: 656664,\n      skyAlpha: .16,\n      cloud: .14,\n      boss: 1,'],
    true, 'zeit', 'SCHWAECHERE Bosse'],
  // Und die Gegenrichtung: mehr Wellen je Sektor, bis das Wellenfenster
  // ueber die 90 s geht. Der Deckel darauf ist seit v40 da, weil an ihm
  // die Bossstufen 4 und 5 haengen — ohne Probe bezeugte er nur den Wert,
  // den der Eichlauf gerade eingestellt hat.
  //
  // Der Eingriff sitzt an der WELLENZAHL, nicht am Abstand: der Abstand
  // steht in src/balance.js (`curve.spacingFloor`) und wird beim Bauen
  // frisch eingespielt — eine Aenderung daran in app.js waere beim
  // naechsten Build wieder weg, und die Probe waere am Bau gescheitert
  // statt am Tor.
  ['halb so viele Wellen mehr je Sektor', '\u2717',
    ['E.length < I && a < 400', 'E.length < Math.round(I * 1.45) && a < 400'],
    true, 'zeit', 'Wellenfenster ueber'],
  // Der Ring von Stufe 3 zurueck auf t+1 Kugeln — der Zustand bis v32.
  // Dann feuert der haerteste Boss duenner als der mittlere, und genau das
  // hat bis zur ersten Messung niemand gesehen.
  ['Ring von Stufe 3 wieder duenn (t+1 Kugeln)', '✗',
    ['const a = t === 1 ? 6 : t === 2 ? 12 : 14,', 'const a = t + 1,'],
    true, 'muster', 'duennere Schuetze'],
  // Phase 2 von Stufe 1 wieder als blosser Faecher: mehr Kugeln, dieselbe
  // Art. Ohne diese Probe belegte das Tor nur den Druck, nicht den Wechsel.
  ['Phase 2 von Stufe 1 ist nur ein breiterer Faecher', '✗',
    ['const a = takt % 2 ? [-.55, -.4, -.25, -.1] : [.1, .25, .4, .55];', 'const a = [-.3, -.1, .1, .3];'],
    true, 'muster', 'nur mehr vom Gleichen'],
  // Die Maschine springt wieder auf den Finger — der Zustand bis v34.
  //
  // Der erste Anlauf setzte speedLerp in src/app.js von 0.5 auf 1 zurueck
  // und das Tor blieb GRUEN: der Eingriff kam nie an, weil buildcore den
  // Wert beim Bauen aus balance.js wieder einspielt. Eiserne Regel 3 —
  // pruefen, ob der Eingriff ankommt. Ein Wert, der aus balance.js
  // stammt, laesst sich nicht durch Aendern von app.js proben; hier muss
  // die STELLE getroffen werden, die ihn benutzt.
  ['Steuerung ohne Glaettung (Sprung je Bild)', '✗',
    ['f = Ft.speedLerp >= 1 ? 1 : 1 - Math.pow(1 - Ft.speedLerp, v),', 'f = 1,'],
    true, 'steuer', 'das ist ein Sprung, keine Nachfuehrung'],
  // Und die Nachfuehrung ohne Zeitkorrektur: dann haengt sie wieder an der
  // Bildrate, und auf zwei Telefonen fuehlt sich dasselbe Spiel anders an.
  ['Nachfuehrung ohne Zeitkorrektur', '✗',
    ['f = Ft.speedLerp >= 1 ? 1 : 1 - Math.pow(1 - Ft.speedLerp, v),', 'f = Ft.speedLerp,'],
    true, 'steuer', 'haengt an der Bildrate'],
  // Die Ringfestung richtet in Phase 2 nicht mehr aus, sondern streut wie
  // in Phase 1. Dann ist der Wechsel der Art weg, den ihr Muster ausmacht.
  ['Ringfestung feuert in Phase 2 wie in Phase 1', '✗',
    ["for (const n of [-.35, -.25, -.15, -.05, .05, .15, .25, .35]) this.spawnEB(v.x, v.y, Math.cos(x + n) * G, Math.sin(x + n) * G);",
     "for (let n = 0; n < 8; n++) { const e = r + n / 8 * p; this.spawnEB(v.x, v.y, Math.cos(e) * G, Math.sin(e) * G) }"],
    true, 'muster', 'nur mehr vom Gleichen'],
  // Und eine Stufenliste, die Stufe 5 vergibt, obwohl das Bild fehlt.
  ['Sektor 120 bekommt Bossstufe 5 ohne Bild', '✗',
    ['label: "Biolumineszenz 10",\n      bg: "bg_biolum_10",\n      sky: 656664,\n      skyAlpha: .16,\n      cloud: .14,\n      boss: 3,',
     'label: "Biolumineszenz 10",\n      bg: "bg_biolum_10",\n      sky: 656664,\n      skyAlpha: .16,\n      cloud: .14,\n      boss: 5,'],
    true, 'zeit', 'vergeben Bossstufe 4 oder 5'],
  // Der Kraftstreifen duenner: vier Layoutpunkte sind auf dem Geraet 2,9
  // Anzeigepunkte, und das ist eine Linie. Genau diese Umrechnung hat in
  // diesem Projekt schon einmal 300 Phantombefunde erzeugt.
  ['Kraftstreifen auf vier Layoutpunkte', 'K',
    ['LEISTE_HOCH = 5,', 'LEISTE_HOCH = 4,'], false],
  // Und ohne dunkle Unterlage: dann traegt er ueber hellem Untergrund nicht,
  // genau wie ein Geschoss ohne Rand.
  ['Kraftstreifen ohne dunkle Unterlage', 'K',
    ['R.fillStyle(659224, .85).fillRoundedRect(G - 2, v - 2, I + 4, LEISTE_HOCH + 4, 3);',
     'R.fillStyle(12578815, .85).fillRoundedRect(G - 2, v - 2, I + 4, LEISTE_HOCH + 4, 3);'], false],
];

if (!existsSync(APP)) { console.error('✗ src/app.js fehlt'); process.exit(1); }

// Zwei Laeufe zugleich waeren toedlich: beide sichern src/app.js, beide
// schreiben es am Ende zurueck — und der zweite legt den Stand des ersten
// ueber die Arbeit, die inzwischen entstanden ist. Genau das ist in v36
// passiert: ein Lauf im Hintergrund hat den fertigen Kraftstreifen wieder
// aus der Quelle entfernt, waehrend nebenher daran gearbeitet wurde. Der
// Warnsatz weiter unten stand da, und er hat nicht gereicht.
//
// Die Sicherungsdatei ist ab jetzt das Schloss. Sie ist auch der Grund,
// warum ein abgestuerzter Lauf hier gemeldet wird, statt still zu
// ueberschreiben.
if (existsSync(SICHER)) {
  console.error(`✗ ${SICHER} liegt schon da.`);
  console.error('  Entweder laeuft gerade eine zweite Gegenprobe — dann diese abwarten,');
  console.error('  NICHT beide laufen lassen: sie schreiben einander die Quelle zurueck.');
  console.error(`  Oder ein Lauf ist abgestuerzt — dann von Hand pruefen, ob ${SICHER}`);
  console.error(`  der Stand ist, den man will, und ihn nach ${APP} zurueckkopieren.`);
  process.exit(1);
}
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
    : tor === 'zeit' ? ['tools/zeitachse.mjs']
    : tor === 'muster' ? ['tools/bossmuster.mjs']
    : tor === 'steuer' ? ['tools/steuerung.mjs']
    : ['tools/farbtor.mjs', ...(statisch ? ['--nurstatisch'] : [])];
  try {
    execFileSync('node', cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { rot: false, text: '' };
  } catch (e) {
    return { rot: true, text: (e.stdout || '') + (e.stderr || '') };
  }
};

if (!NUR_MODUS)
  console.log('  (!) src/app.js wird waehrend dieses Laufs staendig ueberschrieben.\n      NICHT nebenher daran arbeiten — die Aenderung waere lautlos weg.\n');

// Grundlinie: ohne Eingriff muss das Tor gruen sein, sonst misst hier nichts.
if (!NUR_MODUS) {
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
}

let fehler = 0, gelaufen = 0;
for (const [name, pruefung, [alt, neu], neubau, tor = 'farb', erwartet] of (NUR_MODUS ? [] : PROBEN).filter(([n]) => !NUR || n.toLowerCase().includes(NUR))) {
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
    const torName = { farb: 'Farbtor', form: 'Formentor', boden: 'Untergrund-Tafel', kraft: 'Feuerkraft', speicher: 'Speicher-Tafel', rhythmus: 'Rhythmus-Tafel', formation: 'Formationentafel', zeit: 'Zeitachse', muster: 'Bossmuster', steuer: 'Steuerung' }[tor];
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

/* ---------- Modusproben ------------------------------------------------ */

// Nicht jede Zusicherung laesst sich mit einem eingebauten Fehler pruefen.
// Der Ersatzweg des Bildtors ist ein MODUS, kein Defekt: er springt nur ein,
// wenn Phasers Schnappschuss ausfaellt, und das laesst sich nicht durch eine
// Zeile in src/app.js herbeifuehren. `--abzug` schaltet den Phaser-Weg ab
// und stellt damit genau den Zustand her, der am 23.08. auf GitHub eintrat.
//
// Geprueft wird DREIERLEI, und das dritte ist das eigentliche:
//   1. Die acht Menue-Schirme werden trotzdem gemessen (der Ersatzweg traegt,
//      wo sein Urteil massstabsfrei ist).
//   2. Die Querkanten verweigern das Urteil mit Begruendung.
//   3. Es entsteht KEIN erfundener Querkanten-Befund. Ein erster Anlauf liess
//      den Ersatzweg ueberall urteilen und meldete "Nebel: harte Querkante,
//      Sprung 96,3" — einen Befund, den es nicht gibt. Ohne diese Probe
//      koennte genau das unbemerkt zurueckkommen.
const MODUSPROBEN = [{
  // Phaser gibt kein Bild her. Erwartet: die acht Menue-Schirme werden ueber
  // den Ersatzweg gemessen und beurteilt (ihr Massstab ist der Median der
  // acht, der faellt heraus), die Querkanten sagen laut, dass sie NICHT
  // durchgefuehrt wurden — und es entsteht kein erfundener Befund.
  //
  // "Nicht messbar" ist dabei KEIN Befund: das Tor bleibt gruen. Ein Tor,
  // das immer rot ist, weil die Laeufer kaputt sind, wird ignoriert.
  name: 'Bildtor ohne Phaser-Schnappschuss (--abzug)',
  cmd: ['tools/bildtor.mjs', '--abzug'],
  rotErwartet: false,
  exitErwartet: 2,
  mussEnthalten: ['Median Streuung', 'NICHT DURCHGEFÜHRT', 'Querkante nicht gemessen',
    'Menü geprüft, Querkanten NICHT'],
  darfNichtEnthalten: ['harte Querkante', 'Das ist kein Menue'],
  beweist: 'Menü gemessen und beurteilt, Querkanten laut verweigert, Rückgabe 2 („nicht gemessen")',
}, {
  // Jeder Schirm liefert dasselbe Wertepaar. Auf GitHub kam genau das vor:
  // sieben Mal 43,6 / 1,9. Das sind nicht sieben Messungen, das ist ein
  // Bild — und der Median daraus sieht aus wie ein Massstab.
  name: 'Bildtor mit lauter gleichen Schirmen (--flach)',
  cmd: ['tools/bildtor.mjs', '--flach'],
  rotErwartet: true,
  exitErwartet: 1,
  mussEnthalten: ['Das ist kein Menue, das ist ein Bild', 'Nicht gemessen'],
  darfNichtEnthalten: ['Median Streuung'],
  beweist: 'lauter gleiche Schirme werden als „ein Bild" erkannt, nicht als Messung',
},

// ---- Der dritte Ausgang: 2 = "nicht gemessen" -------------------------
//
// Sechs Tore konnten bis v18 nur 0 oder 1. Was dazwischen liegt — der
// Apparat hat gar keine Zahl geliefert — landete je nach Tor auf der
// falschen Seite: das Formentor meldete eine fehlende Textur als BEFUND
// (ein roter Lauf, der ueber das Spiel nichts sagt), die Untergrund-Tafel
// meldete neun von dreizehn Biomen als GRUEN.
//
// `--ohne-naht` nimmt jedem Tor genau die Messstelle weg, an der es haengt.
// Das ist kein nachgestellter Zustand: es ist derselbe, den ein zu frueh
// oder auf einem klemmenden Laeufer messendes Tor antrifft. Verlangt wird
// die Rueckgabe 2 — nicht 0 und nicht 1.
...[
  ['Formentor',        'tools/formen.mjs',       'Textur fuer elite nicht gefunden'],
  ['Untergrund-Tafel', 'tools/untergrund.mjs',   '__SKF_UNTERGRUND fehlt'],
  ['Feuerkraft',       'tools/feuerkraft.mjs',   'Pruefnaehte fehlen'],
  ['Speicher-Tafel',   'tools/speicher.mjs',     'Texturbestand aendert sich noch'],
  ['Rhythmus-Tafel',   'tools/rhythmus.mjs',     '__SKF_BAUSTEINE.kurve fehlt'],
  ['Formationentafel', 'tools/formationen.mjs',  '__SKF_BAUSTEINE fehlt'],
  ['Zeitachse',        'tools/zeitachse.mjs',    '__SKF_BOSSLEBEN'],
  ['Bossmuster',       'tools/bossmuster.mjs',   'fireBoss ist nicht zu erreichen'],
  ['Steuerung',        'tools/steuerung.mjs',    'der Spieler ist nicht zu erreichen'],
].map(([name, datei, marke]) => ({
  name: `${name} ohne Messstelle (--ohne-naht)`,
  cmd: [datei, '--ohne-naht'],
  rotErwartet: false,
  exitErwartet: 2,
  mussEnthalten: ['NICHT GEMESSEN', marke],
  // Ein Tor ohne Messstelle darf ueber das Spiel GAR NICHTS sagen. Sagt es
  // trotzdem "GRÜN —" (der Schlusssatz eines vollstaendigen Laufs), hat es
  // ueber Zahlen geurteilt, die es nicht hat.
  darfNichtEnthalten: ['GRÜN — '],
  beweist: `${name} sagt "nicht gemessen" statt gruen oder rot, Rückgabe 2`,
}))];

let modusFehler = 0, modusGelaufen = 0;
if (ALLE || NUR_MODUS) {
  console.log('');
  for (const m of MODUSPROBEN.filter((m) => !(OHNE_BILD && m.cmd[0].includes('bildtor'))).filter((m) => !NUR || m.name.toLowerCase().includes(NUR))) {
    let text = '', rot = false, code = 0;
    try { text = execFileSync('node', m.cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { code = e.status; rot = true; text = (e.stdout || '') + (e.stderr || ''); }
    modusGelaufen++;
    const mangel = [];
    // Rueckgabe 2 heisst "nicht (vollstaendig) gemessen" und ist KEIN
    // Mangel — check.mjs schreibt dafuer "⚠ nicht gemessen" in den Bericht
    // statt "✅ ohne Befund". Der Wert ist damit ein Vertrag zwischen Tor
    // und Kette, und Vertraege gehoeren geprueft.
    if (m.exitErwartet !== undefined && code !== m.exitErwartet)
      mangel.push(`Rückgabe ${code}, ${m.exitErwartet} erwartet`);
    const echtRot = rot && code !== 2;
    if (m.rotErwartet && !echtRot) mangel.push('Tor blieb GRÜN, rot erwartet');
    if (!m.rotErwartet && echtRot) mangel.push('Tor wurde ROT, grün erwartet');
    for (const t of m.mussEnthalten) if (!text.includes(t)) mangel.push(`„${t}" fehlt im Bericht`);
    for (const t of m.darfNichtEnthalten) if (text.includes(t)) mangel.push(`„${t}" steht im Bericht, darf aber nicht — der Ersatzweg urteilt, wo er nicht darf`);
    if (mangel.length) { console.log(`✗ ${m.name}: ${mangel.join(' · ')}`); modusFehler++; }
    else {
      console.log(`✓ ${m.name} → ${m.beweist}`);
      // Gezeigt wird eine Zeile, die die Probe TATSAECHLICH belegt — nicht
      // eine feste. Der erste Anlauf druckte fuer beide Proben denselben
      // Satz, und der passte nur zur ersten.
      const marke = m.mussEnthalten[m.mussEnthalten.length - 1];
      const zeile = (text.split('\n').find((z) => z.includes(marke)) || '').trim();
      console.log(`    ${zeile.replace(/^[✗·~]\s*/, '')}`);
    }
  }
} else if (MODUSPROBEN.length) {
  console.log(`\n(—) ${MODUSPROBEN.length} Modusprobe(n) — brauchen den gebauten Stand, mit --alle`);
}

// Hat jemand src/app.js WAEHREND des Laufs angefasst?
//
// Die Datei wird hier staendig ueberschrieben und aus der Kopie
// zurueckgeschrieben. Wer nebenher daran arbeitet, verliert seine Arbeit beim
// naechsten `zurueck()` — lautlos. Genau das ist beim Bauen dieser Pruefung
// passiert: eine Versionsanhebung war zwanzig Minuten spaeter wieder weg.
//
// Der Kopf dieser Datei sagt seit jeher, dass frische Arbeit einen ABBRUCH
// ueberlebt. Das stimmt und war nie die Gefahr. Die Gefahr ist die
// Bearbeitung waehrend des Laufs, und darueber stand nichts.
if (readFileSync(APP, 'utf8') !== readFileSync(SICHER, 'utf8'))
  console.log('\n⚠ src/app.js weicht am Ende von der Ausgangskopie ab — hat jemand waehrend des Laufs daran gearbeitet? Die Aenderung ist dann verloren.');

console.log(`\n${gelaufen} Probe(n) gelaufen, ${fehler} ohne Wirkung.`);
if (modusGelaufen) console.log(`${modusGelaufen} Modusprobe(n) gelaufen, ${modusFehler} ohne Wirkung.`);
process.exit(fehler + modusFehler ? 1 : 0);

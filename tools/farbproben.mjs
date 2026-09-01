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
// Nicht jeder Eingriff sitzt in src/app.js. Die Messtafel haengt in der
// HUELLE (index.head.html) — bewusst, damit sie einen Absturz des Spiels
// ueberlebt. Eine Probe kann deshalb ihre Datei nennen; gesichert und
// zurueckgeschrieben wird dann jene, nach derselben Regel: eine Kopie
// vorher, und aus der Kopie zurueck, auch bei einem Abbruch (Regel 1).
const HUELLE = 'index.head.html';
const HUELLE_SICHER = 'index.head.html.probe';

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
  // Der Massstab der Gegnerbilder zurueck auf die Klassentabelle, an der
  // v52 gescheitert ist. Die Lanzenwache wird damit wieder 162 x 401
  // Weltpunkte gross und legt sich ueber das Missionsziel — genau das, was
  // der Nutzer fotografiert hat. Verlangt wird, dass das Ueberlappungstor
  // es sagt, nicht nur dass es rot wird.
  // Das Nachtragen abschalten: dann zeichnet die Vorschau nur, was beim
  // Betreten schon geladen war — die Lotterie von v52. Verlangt wird, dass
  // das Tor die Unvollstaendigkeit BENENNT, nicht bloss rot wird.
  // Dem Siegesbildschirm die Tippflaeche wegnehmen — der Zustand, in dem
  // v49 bis v55 waren. Der Schirm sagt "Tippen → Weltkarte", der Handler
  // verwirft den Tipp, und man kommt nach einem gewonnenen Level nicht
  // mehr zurueck. Verlangt wird, dass das Tor GENAU DAS sagt.
  ['Siegesbildschirm ohne Tippflaeche', '✗',
    ['this.endeKnoepfe = [{\n          x: J / 2, y: rt / 2, w: J, h: rt,',
     'this.endeKnoepfeAus = [{\n          x: J / 2, y: rt / 2, w: J, h: rt,'], true, 'ende',
    'KEINE Tippflaeche'],
  // Das sektorweise Halten der Bosstextur wegnehmen: dann liegen wieder
  // alle vier gleichzeitig im Speicher. Verlangt wird, dass die
  // Speicher-Tafel das SAGT — sie ist der einzige Ort, an dem so etwas
  // auffaellt, denn ein Spiel mit zuviel Grafikspeicher laeuft, bis Safari
  // es ohne Vorwarnung beendet.
  ['Bosstexturen nicht mehr sektorweise halten', '✗',
    ['this.wellenplan = I, bossVorratHalten(this, bossStufeGedeckelt(this, R.boss || 1)), this.vorwaermen(I),',
     'this.wellenplan = I, this.vorwaermen(I),'], true, 'speicher',
    'ueber der Grenze'],
  // Die Bossleiste zurueck an ihren alten Platz: ueber die ganze Breite,
  // bei y = 118. Genau so lief sie neun Fassungen lang quer ueber die
  // Kopfzeilentafel, und der Erfahrungsbalken des Flugzeugs lag in jedem
  // Bosskampf darunter. Verlangt wird, dass das Tor die beiden Flaechen
  // BENENNT — nicht, dass es irgendwie rot wird.
  ['Bossleiste wieder ueber die ganze Breite (der alte Platz)', '✗',
    ['              r = J - 216,\n              n = 200,', '              r = J - 32,\n              n = 16,'],
    true, 'kopf', 'Bossleiste'],
  // Der Rangname wieder starr bei 15 Punkten: dann ragt „OBERLEUTNANT"
  // ueber den Rand der Tafel. Ein Fehler, der nur bei EINEM von sieben
  // Raengen auftritt — deshalb misst das Tor mit genau diesem.
  ['Rangname wieder starr bei 15 Punkten', '✗',
    ['rangName.width > 112 && rangName.setFontSize(13);', 'void rangName;'],
    true, 'kopf', 'OBERLEUTNANT'],
  // DER ECHTE FEHLER AUS v58: der Kauf einer Sekundaerwaffe setzte nur
  // `secondary` und liess `up_sec` auf 0 — und beide Feuerstellen
  // verlangen Stufe > 0. Wer 1000 Gold fuer die Suchraketen zahlte, sah
  // „✓ Aktiv" und es passierte nichts. Verlangt wird, dass das Tor genau
  // das SAGT, nicht dass es irgendwie rot wird.
  ['Kauf einer Sekundaerwaffe laesst die Stufe wieder auf 0', '✗',
    ['vt("secondary", T), T !== "none" && this.upg("sec") < 1 && this.setUpg("sec", 1)',
     'vt("secondary", T)'], true, 'ruestung', 'Stufe 0'],
  // Und der zweite Teil: wieder BEIDE Beiflugschiffe zeichnen, das
  // ungekaufte nur kleiner und grauer. So stand es bis v57, und so
  // entstand der Eindruck, der Kauf sei wirkungslos.
  ['Beiflug wieder immer beide zeichnen (das ungekaufte nur kleiner)', '✗',
    ['this.wingmen = [-48, 48].slice(0, q.upg("wingman")).map((A) => ({\n          img: this.add.image(this.player.x + A, this.player.y + 26, this.player.texture.key).setScale(.32).setTint(10477823).setDepth(9),\n          dx: A,\n          fires: !0\n        }))',
     'this.wingmen = [-48, 48].map((A, m) => ({\n          img: this.add.image(this.player.x + A, this.player.y + 26, this.player.texture.key).setScale(m < q.upg("wingman") ? .32 : .24).setTint(m < q.upg("wingman") ? 10477823 : 9090252).setDepth(9),\n          dx: A,\n          fires: m < q.upg("wingman")\n        }))'],
    true, 'ruestung', 'gezeichnet'],
  // DER FEHLER, DEN DER NUTZER GEMELDET HAT: die Messschleife steigt bei
  // eingeklappter Tafel wieder aus. Dann misst man nur, solange man
  // hinsieht — und der Fall, in dem man misst, ist genau der andere.
  ['Messtafel misst nur, solange sie offen ist', '✗',
    ['        if (!an) { vorher = t; return; }', '        if (!an || !offen) { vorher = t; return; }'],
    true, 'messtafel', 'steigt die Bilderzahl nicht', HUELLE],
  // Die Schwellen der Effekt-Absenkung zurueck auf feste Zahlen: dann
  // liegt zwischen 46 und 56 wieder ein totes Band, und genau darin lebt
  // das Geraet des Nutzers (55,6 Bilder je Sekunde). Der Regler faellt
  // einmal und kommt nie zurueck.
  ['Effekt-Absenkung wieder mit festen Schwellen (46/56)', '✗',
    ['    const G = E * .78,\n      v = E * .9;', '    const G = 46,\n      v = 56;'],
    true, 'messtafel', 'knapp am Takt'],
  // Der Tafel die Durchlaessigkeit nehmen: dann faengt der eingeklappte
  // Streifen wieder jeden Zug ab, der auf ihm beginnt — genau der Fehler,
  // den der Nutzer gemeldet hat („man kann das Flugzeug kaum sauber
  // steuern"). Verlangt wird, dass das Tor die WIRKUNG benennt, nicht nur
  // rot wird.
  ['Messtafel faengt wieder Beruehrungen ab', '✗',
    ['      pointer-events:none}\n    #messung .knopf{pointer-events:auto}',
     '      pointer-events:auto}\n    #messung .knopf{pointer-events:auto}'],
    true, 'messtafel', 'erreicht das Spiel nicht', HUELLE],
  // Und der Takt wieder aus der GEMESSENEN Rate: dann geht die Tafel beim
  // Einbruch mit und faerbt ein p95 von 350 ms gruen.
  //
  // Ein erster Anlauf tauschte nur `schnellMs` zurueck auf den Median —
  // und das Tor blieb gruen. Zu Recht: der Rueckfall auf `Math.round(hz)`
  // war der Fehler, nicht die Wahl der Probe. Ohne ihn sagt die Tafel
  // auch aus dem Median „unbekannt", und das ist richtig. Eine Probe, die
  // die falsche Haelfte zurueckdreht, beweist nichts.
  ['Bildschirmtakt wieder aus der gemessenen Rate', '✗',
    ['var takt = hzSchnell > 100 ? 120 : hzSchnell > 75 ? 90 : hzSchnell > 45 ? 60 : 0;',
     'var takt = hzSchnell > 100 ? 120 : hzSchnell > 75 ? 90 : hzSchnell > 45 ? 60 : Math.round(hzSchnell);'],
    true, 'messtafel', 'Takt gehoert zum Bildschirm', HUELLE],
  // DIE MESSUNG WIEDER AN `isActive` HAENGEN. Dann wirft jede Pause sie
  // weg — und genau daran war die v69-Zeile vom Geraet nicht zu lesen:
  // `Q 0.15` bei angeblich 2,4 Sekunden Laufzeit.
  ['Messung haengt wieder an isActive statt am Lauf', '✗',
    ['        var lauf = s0 && s0.laufNr != null ? s0.laufNr : null;\n        if (lauf != null && lauf !== letzterLauf) { letzterLauf = lauf; zuruecksetzen(); vorher = t; return; }',
     '        var drin = !!(s0 && s0.scene && s0.scene.isActive && s0.scene.isActive());\n        if (drin && !letzterLauf) { letzterLauf = 1; zuruecksetzen(); vorher = t; return; }\n        if (!drin) letzterLauf = null;'],
    true, 'messtafel', 'eine Pause setzt die Messung zurueck', HUELLE],
  // DAS FALLEN DES Q-REGLERS WIEDER UNGEBREMST. Genau so stand es bis
  // v68: die Regel laeuft dreimal je Sekunde, ein Ruckler von 90 ms schob
  // den Regler in 2,7 Sekunden auf den Boden. Gemessen auf dem Geraet,
  // Sektor 1: 58,8 Bilder je Sekunde und trotzdem Q 0,15.
  ['Q-Regler faellt wieder ungebremst', '✗',
    ['return R < G ? b - I > 600 ? { q: Math.max(.15, T - .12), qUpAt: b } : { q: T, qUpAt: I } : R > v',
     'return R < G ? { q: Math.max(.15, T - .12), qUpAt: I } : R > v'],
    true, 'messtafel', 'kurzer Ruckler'],
  // DIE VIER-TIPP-ECKE WIEDER AUCH IM GEFECHT. Dann liegt sie erneut auf
  // Pause und Ton: vier Mal pausieren schaltet die Messung um.
  ['Vier-Tipp-Ecke zaehlt wieder im Gefecht', '✗',
    ['          if (sp && sp.scene && sp.scene.isActive && sp.scene.isActive()) { tipps = 0; return; }\n', ''],
    true, 'messtafel', 'PAUSEKNOPF', HUELLE],
  // DIE COMBO-LEISTE WIEDER AUF DIE ZEHNERMARKE. Dann zeigt sie den Weg
  // zu einer Stelle, an der sich am Faktor nichts aendert.
  ['Combo-Leiste wieder auf die Zehnermarke', '✗',
    ['return { faktor: b, stufe: R, max: E, anteil: E ? 1 : T % 4 / 4, bisNaechste: E ? 0 : 4 - T % 4 }',
     'return { faktor: b, stufe: R, max: E, anteil: T % 10 / 10, bisNaechste: E ? 0 : 4 - T % 4 }'],
    true, 'kopf', 'die Leiste steht bei'],
  // DREI BILDFUELLENDE EBENEN OBENDRAUF. Genau die Sorte Posten, die die
  // bemalte Flaeche traegt: in Sektor 3 bemalen sieben Rechtecke 1,86
  // Bildschirme — mehr als alles andere zusammen. Wer noch drei dazulegt,
  // muss auffallen.
  ['Drei bildfuellende Ebenen ins Gefecht legen', '✗',
    ['}), this.ground = this.physics.add.group(), this.decor = this.physics.add.group()',
     '}), this.ground = this.physics.add.group(), this.decor = this.physics.add.group(), [0, 1, 2].forEach(() => this.add.rectangle(J / 2, rt / 2, J, rt, 2237106, .9).setDepth(60))'],
    true, 'sektor', 'Bildschirme je Bild'],
  // AUFRAEUMEN WIEDER AN DIE GEGNERZAHL HAENGEN. Genau so stand es bis
  // v66: in Sektor 106 traf „hoechstens zwei Gegner" auf 0,7 % der Bilder
  // zu, und in 90 Sekunden wurde genau EINMAL aufgeraeumt.
  ['Aufraeumen wieder nur bei hoechstens zwei Gegnern', '✗',
    ['        if (this.echteBildzeit() > 1.5 * (1e3 / this.taktHz()) && x < E + b + I + G) return;',
     '        if (this.enemies.countActive(!0) > 2 || this.boss && this.boss.active) return;'],
    true, 'sektor', 'aufgeraeumt'],
  // DAS LEUCHTEN WIEDER ALS SHADER JE BILD statt gebacken. Genau so stand
  // es bis v65 an sieben Stellen: zwei Pufferwechsel je Bild und Objekt,
  // solange der Schirm steht — das Menue kam auf fuenf, ein laufender
  // Sektor braucht einen.
  ['Menuetitel-Leuchten wieder als Shader je Bild', '✗',
    ['      const k = leuchtschrift(this, E, 7327999, 18),',
     '      const k = (E.preFX && E.preFX.addGlow && E.preFX.addGlow(7327999, 4, 0, !1, .08, 18), null),'],
    true, 'zeichenwerk', 'Pufferwechsel je Bild'],
  // DIE TAFEL SCHREIBT SICH IHRE EIGENE ARBEIT NICHT MEHR ZU: der
  // Formwechsel wird nicht mehr gemeldet, also faellt die Bildluecke des
  // Aufklappens wieder in „laengste". Genau so entstand die Frage, ob die
  // 115 ms der dritten Geraetemessung vom Spiel kamen oder vom Ablesen.
  ['Messtafel bucht das Aufklappen nicht mehr als eigene Arbeit', '✗',
    ['        if (tafel.className !== vorherKlasse) eigenTat = \'Form\';\n', ''],
    true, 'messtafel', 'nicht als genau ein eigenes Bild', HUELLE],
  // Und die Gegenrichtung (Regel 13): jedes Auffrischungsbild als eigene
  // Arbeit buchen. Dann faellt die halbe Messung aus der Statistik und die
  // Tafel rechnet sich gruen — ohne dass ein Zaehler auffaellt, wenn das
  // Tor nur die eine Richtung prueft.
  ['Messtafel bucht auch gewoehnliche Auffrischungen als eigene Arbeit', '✗',
    ['          } else if (eigenTat) {', '          } else if (eigenTat || gezeichnet) {'],
    true, 'messtafel', 'ohne dass etwas umgebaut wurde', HUELLE],
  // Dem PAUSENSCHIRM eine Ueberlappung einbauen: der Knopf „Level neu
  // starten" wandert auf „Fortsetzen". Bis v60 haette das kein Tor
  // gesehen — die Pause war der einzige Schirm, den keines betrat.
  ['Pausenschirm: zwei Knoepfe uebereinander', '✗',
    ['}), Tt(this, J / 2, rt * .535, 300, 56, "↻  Level neu starten"',
     '}), Tt(this, J / 2, rt * .44, 300, 56, "↻  Level neu starten"'],
    true, 'schirme', 'Pause'],
  // Der Kauf der Hauptwaffe merkt sich nichts: dann steht nach dem
  // Bezahlen immer noch die alte Waffe im Spielstand. Derselbe Fehlertyp
  // wie bei der Sekundaerwaffe, nur an der anderen Stelle.
  ['Kauf der Hauptwaffe merkt sich die Wahl nicht', '✗',
    ['      setWeapon(T) {\n        vt("weapon", T)\n      },',
     '      setWeapon(T) {\n        void T\n      },'], true, 'ruestung', 'im Spielstand'],
  // Der Tier-Bonus zaehlt nur noch die ANGELEGTEN Stuecke. Das ist die
  // naheliegendste „Aufraeumung" an dieser Stelle — und sie wuerde eine
  // vom Nutzer bestaetigte Sammlungsmechanik still abschaffen. Verlangt
  // wird, dass das Tor genau das sagt.
  ['Tier-Bonus zaehlt den Bestand nicht mehr', '✗',
    ['      for (const i of alle) E += $t(i, "dmg") * o, b += $t(i, "crit") * o, I += $t(i, "critMult") * o, G += $t(i, "pierce") * o',
     '      for (const i of R.filter(h => h.rarity === s)) E += $t(i, "dmg") * o, b += $t(i, "crit") * o, I += $t(i, "critMult") * o, G += $t(i, "pierce") * o'],
    true, 'ruestung', 'Bestand soll mitzaehlen'],
  // Angelegte Module wirken nicht mehr: die haeufigste Art, eine
  // Ausruestung still zu verlieren — sie ist da, sie steht auf dem
  // Schirm, und sie tut nichts.
  ['Angelegte Module wirken nicht mehr', '✗',
    ['const I = Mi(Wt.all());', 'const I = Mi([]);'], true, 'ruestung', 'Modul wirkt nicht'],
  ['Gegnerbilder nicht nachtragen (nur zeichnen, was schon da ist)', '✗',
    ['this.textures.on("addtexture", nach);', 'void nach;'], true, 'lage',
    'Gegnerband zeigt'],
  ['Gegnerbilder wieder nach Klasse skalieren (statt in den Kasten)', '✗',
    ['let pa = Math.min(kb / qw, kh / qh, 1);', 'let pa = ({S:.42,M:.56,L:.68,XL:.9}[I.cls] || .55) / an;'], true, 'lage',
    'verdeckt'],
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
  // DIESE PROBE WAR VERROTTET UND HAT ES SELBST GEMELDET (v69).
  //
  // Sie hing an `boss: 2` in Lavaplanet 7 — dort steht heute `boss: 4`.
  // Der Eingriff kam nicht mehr an, und das Werkzeug sagte genau das:
  // „Eingriff NICHT ANGEKOMMEN — Stelle 0x gefunden". Ohne diese Prüfung
  // hätte die Probe seit unbekannt vielen Runden gegrünt, ohne je etwas
  // zu tun (Regel 3).
  //
  // Der neue Eingriff hängt nicht mehr an einer Zahl, die sich beim
  // Balancieren bewegt, sondern an der Kapitelgrenze: bekommt XII
  // denselben Start wie XI, decken beide dieselben zehn Sektoren ab und
  // tragen zwangsläufig dieselbe Bossreihe. Ein Zeichen, und es ist
  // zugleich ein Fehler, den es wirklich geben könnte.
  ['Kapitel XII beginnt beim selben Sektor wie XI', '✗', [
    'roman: "XII",\n      start: 111,',
    'roman: "XII",\n      start: 101,'],
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
  // Den Deckel wegnehmen, der die Bossstufe an den Bildvorrat bindet.
  // Dann steht in Sektor 120 wirksam Stufe 5, ohne dass es ein Bild dafuer
  // gibt: ein Boss, der aussieht wie Stufe 3 und schiesst wie Stufe 5.
  // Genau davor warnt die Zeitachse seit v38 — bis v40 als Hinweis an den,
  // der die Liste umstellt, seit v41 als Pruefung des Deckels selbst.
  ['Bossstufe nicht mehr am Bildvorrat gedeckelt', '\u2717',
    ['E = bossStufeGedeckelt(R, E),', 'E = Math.min(5, E),'],
    true, 'zeit', 'Der Deckel greift nicht'],
  // Und die zweite neue Pruefung: haelt die Kampagne das Band, wenn die
  // Bilder da sind? Der Aufschlag der obersten Stufe von 2,0 auf 2,6 laesst
  // den letzten Sektor auf ueber drei Minuten wachsen. Ohne diese Probe
  // bezeugte die Pruefung nur den Entwurf, den sie vorgefunden hat.
  ['oberste Bossstufe mit 2,6-fachem Leben', '\u2717',
    ['stufe >= 5 ? 2 : stufe >= 4 ? 1.75', 'stufe >= 5 ? 2.6 : stufe >= 4 ? 1.75'],
    true, 'zeit', 'VORGESEHENEN Bossstufe ueber'],
  // Den Hof wieder ueber den Bildrand laufen lassen — der Zustand bis v42.
  // Dann steht um die grossen Geschosse ein dunkles Rechteck mit harten
  // Kanten. Auf dunklem Grund sieht man es nie, auf Wueste und Schnee
  // sofort: gefunden auf dem Geschossbogen, nicht von einem Tor.
  ['Hof der Geschosse laeuft ueber den Bildrand', '\u2717',
    ['b = Math.min(b, T.canvas.width / 2, T.canvas.height / 2);', 'b = b;'],
    true, 'bogen', 'abgeschnittenen Hof'],
  // Das Vorwaermen wieder herausnehmen: dann backt jede Gegnerart beim
  // ersten Spawn selbst, mitten im Einflug der Welle. Das war der Zustand
  // bis v44 und der Grund fuer "es wirkt etwas abgehakt, wenn die Gegner
  // kommen".
  ['Gegnerbilder werden nicht mehr vorgewaermt', '\u2717',
    ['this.vorwaermen(I), this.levelEndAt', 'this.levelEndAt'],
    true, 'waerme', 'werden erst beim Spawnen gebacken'],
  // Und die zwei Knoepfe aus dem Ergebnisbildschirm nehmen: dann fuehrt
  // aus ihm kein Weg mehr heraus, den man sehen kann.
  ['Ergebnisbildschirm ohne Knoepfe', '\u2717',
    ['this.endeKnoepfe = [', 'this.endeKnoepfe = null && ['],
    true, 'ende', 'statt zwei'],
  // Den Elite-Ring zurueck auf vierzehn Kugeln — der Zustand bis v45.
  // Dann haelt ein einziger Elite 45 Geschosse gleichzeitig im Bild, und
  // genau das war der Befund aus der gespielten Runde.
  ['Elite-Ring wieder mit vierzehn Kugeln', '\u2717',
    ['for (let G = 0; G < 7; G++) {\n            const v = G / 7 * Math.PI * 2;',
     'for (let G = 0; G < 14; G++) {\n            const v = G / 14 * Math.PI * 2;'],
    true, 'dichte', 'halten allein mehr als'],
  // Die Sperre aus dem Trefferton nehmen — der Zustand bis v46. Dann
  // laufen bei Autofeuer zwanzig Toene je Sekunde uebereinander.
  ['Trefferton wieder ohne Sperre', '\u2717',
    ['if (R && R < this.hitSperre) return;', 'if (!1) return;'],
    true, 'klang', 'kommen'],
  // Und die Abstufung: dann klingt der Spaeher wie der Traeger.
  ['Abschuss wieder fuer alle gleich gross', '\u2717',
    ['if (K === "L") {', 'if (K === "L" || 1) {'],
    true, 'klang', 'wie ein Traeger'],
  // Den Musikvorrat wegnehmen: dann faellt das Spiel auf den erzeugten
  // Klang von v48 zurueck. Das SOLL es koennen — aber das Tor muss es
  // merken, sonst laeuft irgendwann wieder der Achttakter und niemand
  // sieht es.
  ['kein Musikvorrat im Bau', '\u2717',
    ['window.__SKF_STUFEN = Ut,', 'window.__SKFM = void 0, window.__SKF_STUFEN = Ut,'],
    true, 'musik', 'kein Musikvorrat im Bau'],
  // Den Bosstakt zurueck auf den Stand bis v50: dann haelt Stufe 5
  // sechsundvierzig Geschosse gleichzeitig im Bild.
  // Der Eingriff sitzt bei STUFE 5, nicht bei Stufe 2. Der erste Anlauf
  // nahm die Streckung dort weg, wo sie am wenigsten wiegt: Stufe 2 liegt
  // auch ungestreckt bei 28,7 und damit unter dem Band von 32. Das Tor
  // blieb gruen, und die Probe belegte nichts. Eine Gegenprobe muss die
  // Stelle treffen, an der die Pruefung ueberhaupt greifen kann.
  ['Bosstakt der hoechsten Stufe wieder ohne Streckung', '\u2717',
    ['E.nextFire = R + 400 * 1.45 * this.fireRateMul',
     'E.nextFire = R + 400 * this.fireRateMul'],
    true, 'dichte', 'Bossstufe(n) halten mehr als'],
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
  // Die Probe von v38 stand hier: „Sektor 120 bekommt Bossstufe 5 ohne
  // Bild". Sie greift nicht mehr ein — seit v41 STEHT dort Stufe 5, und
  // der Deckel faengt sie ab. An ihre Stelle tritt die Probe, die den
  // Deckel selbst wegnimmt.
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
copyFileSync(HUELLE, HUELLE_SICHER);
const zurueck = () => { copyFileSync(SICHER, APP); copyFileSync(HUELLE_SICHER, HUELLE); };
process.on('exit', () => {
  if (existsSync(SICHER)) { copyFileSync(SICHER, APP); unlinkSync(SICHER); }
  if (existsSync(HUELLE_SICHER)) { copyFileSync(HUELLE_SICHER, HUELLE); unlinkSync(HUELLE_SICHER); }
});

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
    : tor === 'bogen' ? ['tools/geschossbogen.mjs']
    : tor === 'waerme' ? ['tools/vorwaermen.mjs']
    : tor === 'ende' ? ['tools/niederlage.mjs']
    : tor === 'dichte' ? ['tools/geschossdichte.mjs']
    : tor === 'klang' ? ['tools/klang.mjs']
    : tor === 'musik' ? ['tools/musik.mjs']
    : tor === 'lage' ? ['tools/ueberlappung.mjs']
    : tor === 'kopf' ? ['tools/kopfzeile.mjs']
    : tor === 'ruestung' ? ['tools/ruestung.mjs']
    : tor === 'schirme' ? ['tools/schirme.mjs']
    : tor === 'messtafel' ? ['tools/messtafel.mjs']
    : tor === 'zeichenwerk' ? ['tools/zeichenwerk.mjs']
    : tor === 'sektor' ? ['tools/sektor.mjs']
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
for (const [name, pruefung, [alt, neu], neubau, tor = 'farb', erwartet, datei = APP] of (NUR_MODUS ? [] : PROBEN).filter(([n]) => !NUR || n.toLowerCase().includes(NUR))) {
  if (neubau && !ALLE) { console.log(`(—) ${name} — braucht Neubau, mit --alle`); continue; }
  const quelle = datei === HUELLE ? HUELLE_SICHER : SICHER;
  const roh = readFileSync(quelle, 'utf8');
  const n = roh.split(alt).length - 1;
  if (n !== 1) {
    console.log(`✗ ${name}: Eingriff NICHT ANGEKOMMEN — Stelle ${n}x in ${datei} gefunden, 1x erwartet`);
    fehler++; continue;
  }
  writeFileSync(datei, roh.replace(alt, neu));
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
    const torName = { farb: 'Farbtor', form: 'Formentor', boden: 'Untergrund-Tafel', kraft: 'Feuerkraft', speicher: 'Speicher-Tafel', rhythmus: 'Rhythmus-Tafel', formation: 'Formationentafel', zeit: 'Zeitachse', muster: 'Bossmuster', steuer: 'Steuerung', bogen: 'Bildbogen', waerme: 'Vorwaermen', ende: 'Ergebnis', dichte: 'Geschossdichte', klang: 'Klang', musik: 'Musik', lage: 'Überlappung', kopf: 'Kopfzeile', ruestung: 'Rüstung', schirme: 'Schirme', messtafel: 'Messtafel', zeichenwerk: 'Zeichenwerk', sektor: 'Sektor' }[tor];
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
}, {
  // Ohne Anzeigeliste gibt es keine Rechtecke — und dann darf das
  // Ueberlappungstor weder gruen noch rot sagen.
  name: 'Überlappung ohne Messstelle (--ohne-naht)',
  cmd: ['tools/ueberlappung.mjs', '--ohne-naht'],
  rotErwartet: false,
  exitErwartet: 2,
  mussEnthalten: ['NICHT GEMESSEN', 'Szene nicht erreichbar'],
  darfNichtEnthalten: ['GRÜN — '],
  beweist: 'ohne Anzeigeliste sagt das Tor "nicht gemessen", Rückgabe 2',
}, {
  // Ohne die Naht kennt das Kopfzeilentor die Rechtecke nicht, die die
  // Kopfzeile zeichnet — Tafel, Kraftleiter, Lebensgurt und Bossleiste
  // sind Graphics und haben keine getBounds(). Dann darf es weder gruen
  // noch rot sagen.
  name: 'Kopfzeile ohne Messstelle (--ohne-naht)',
  cmd: ['tools/kopfzeile.mjs', '--ohne-naht'],
  rotErwartet: false,
  exitErwartet: 2,
  mussEnthalten: ['NICHT GEMESSEN', '__SKF_KOPFZEILE fehlt'],
  darfNichtEnthalten: ['GRÜN — '],
  beweist: 'ohne die Naht sagt das Tor "nicht gemessen", Rückgabe 2',
}, {
  // Ohne `window.__game` kommt das Ruestungstor in keinen Sektor und kann
  // keinen Spielstand wechseln. Dann darf es weder gruen noch rot sagen.
  name: 'Rüstung ohne Messstelle (--ohne-naht)',
  cmd: ['tools/ruestung.mjs', '--ohne-naht'],
  rotErwartet: false,
  exitErwartet: 2,
  mussEnthalten: ['NICHT GEMESSEN', 'window.__game fehlt'],
  darfNichtEnthalten: ['GRÜN — '],
  beweist: 'ohne die Naht sagt das Tor "nicht gemessen", Rückgabe 2',
}, {
  // Ohne die Anzeigeliste kann das Schirme-Tor keinen Schirm auslesen. Bis
  // v60 meldete es dann NEUN BEFUNDE ueber ein voellig gesundes Spiel
  // („Szene laesst sich nicht starten") — der Apparat war ausgefallen, die
  // Schuld bekam das Spiel. Genau die Trennlinie aus Regel 42.
  name: 'Schirme ohne Messstelle (--ohne-naht)',
  cmd: ['tools/schirme.mjs', '--ohne-naht'],
  rotErwartet: false,
  exitErwartet: 2,
  mussEnthalten: ['NICHT GEMESSEN', 'nicht auslesbar', '0 von 11'],
  darfNichtEnthalten: ['laesst sich nicht starten'],
  beweist: 'ohne Anzeigeliste sagt das Tor "nicht gemessen" statt Befunde ueber ein gesundes Spiel',
}, {
  // Ohne die Kopierzeile kann das Messtafel-Tor sie nicht pruefen.
  name: 'Messtafel ohne Messstelle (--ohne-naht)',
  cmd: ['tools/messtafel.mjs', '--ohne-naht'],
  rotErwartet: false,
  exitErwartet: 2,
  mussEnthalten: ['NICHT GEMESSEN', '__SKF_MESSZEILE fehlt'],
  darfNichtEnthalten: ['GRÜN — '],
  beweist: 'ohne die Naht sagt das Tor "nicht gemessen", Rückgabe 2',
}, {
  // Ohne Zugriff auf die Spielschleife kann der Sektor nichts rechnen.
  name: 'Sektor ohne Messstelle (--ohne-naht)',
  cmd: ['tools/sektor.mjs', '--ohne-naht'],
  rotErwartet: false,
  exitErwartet: 2,
  mussEnthalten: ['NICHT GEMESSEN', 'Spielschleife'],
  darfNichtEnthalten: ['GRÜN — '],
  beweist: 'ohne die Spielschleife sagt das Tor "nicht gemessen", Rückgabe 2',
}, {
  // Ohne GL-Zugang kann das Zeichenwerk keinen einzigen Befehl zaehlen.
  name: 'Zeichenwerk ohne Messstelle (--ohne-naht)',
  cmd: ['tools/zeichenwerk.mjs', '--ohne-naht'],
  rotErwartet: false,
  exitErwartet: 2,
  mussEnthalten: ['NICHT GEMESSEN', 'GL-Zugang'],
  darfNichtEnthalten: ['GRÜN — '],
  beweist: 'ohne den GL-Zugang sagt das Tor "nicht gemessen", Rückgabe 2',
}, {
  // DIE PROBE ZUM AUSLIEFERUNGSTOR.
  //
  // Sie stellt den Zustand her, an dem v49, v50 und v51 gescheitert sind:
  // die Musik bleibt als data:-Adresse in der Seite, die Seite waechst von
  // 3,0 auf 7,2 MB, die Schranke liegt bei 5. Verlangt wird genau dieser
  // Befund — nicht irgendein roter Lauf.
  //
  // Warum das noetig ist: das Tor hat es damals nicht gegeben, und die
  // Regel stand nur als Shell-Block in der Lieferkette, wo sie beim
  // Arbeiten niemand laufen liess. Eine Pruefung, die nie etwas meldet,
  // ist kein Beweis — und diese hier soll den einen Fehler fangen, der
  // dreimal hintereinander durchgekommen ist.
  //
  // Sie laesst dist/pages/ ohne Musik zurueck; das naechste `npm run pages`
  // baut es richtig.
  name: 'Auslieferung ohne ausgelagerte Musik (--probe-ohne-musik)',
  cmd: ['tools/auslieferung.mjs', '--probe-ohne-musik', '--ohne-browser'],
  rotErwartet: true,
  exitErwartet: 1,
  mussEnthalten: ['Auslagerung hat nicht gegriffen', 'data:audio'],
  darfNichtEnthalten: [],
  beweist: 'das Auslieferungstor faengt genau den Fehler, der v49 bis v51 nicht auf die Seite kommen liess',
}, {
  // Und der dritte Ausgang: ohne gebauten Pages-Stand gibt es nichts zu
  // messen — und dann darf das Tor weder gruen noch rot sagen.
  name: 'Auslieferung ohne Messstelle (--ohne-naht)',
  cmd: ['tools/auslieferung.mjs', '--ohne-naht'],
  rotErwartet: false,
  exitErwartet: 2,
  mussEnthalten: ['NICHT GEMESSEN', 'ohne gebauten Pages-Stand'],
  darfNichtEnthalten: ['GRÜN — '],
  beweist: 'ohne gebauten Pages-Stand sagt das Tor "nicht gemessen", Rückgabe 2',
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

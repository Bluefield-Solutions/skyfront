/*
  Ein Tor kennt DREI Ausgaenge, nicht zwei.

    0   gemessen, kein Befund
    1   BEFUND     — das Spiel oder seine Daten sagen etwas Falsches
    2   UNGEMESSEN — der Apparat hat keine Zahl geliefert

  Der Unterschied zwischen 1 und 2 hat in sechs von acht Toren gefehlt, und
  er fehlt in beide Richtungen zugleich:

  Nach OBEN: das Formentor meldete „Textur fuer elite nicht gefunden" als
  Befund. Das ist kein Mangel am Spiel — das ist ein Tor, das zu frueh
  gemessen hat. Genau diese Sorte falscher Befund hat auf GitHub schon einen
  roten Lauf erzeugt (Lauf 31, Ersatzweg des Bildtors).

  Nach UNTEN: die Untergrund-Tafel misst dreizehn Biome, protokolliert die
  nicht dekodierbaren mit „(—)" und meldet dann GRUEN ueber die uebrigen.
  Neun von dreizehn gemessen sieht aus wie dreizehn von dreizehn.

  Beides ist dieselbe Luecke. Ein Tor, das nichts geprueft hat, darf weder
  aussehen wie eines, das bestanden hat, noch wie eines, das etwas gefunden
  hat.

  Wer eine Messstelle benutzt, bekommt das Urteil geschenkt — und mit ihm
  die Regel, dass Befunde vor Ungemessenem kommen: ein echter Mangel bleibt
  ein Mangel, auch wenn daneben etwas nicht messbar war.
*/

// Der Hebel fuer die Gegenprobe. Ein Ausgang, der sich nicht herbeifuehren
// laesst, ist nicht geprueft — und ein nie genommener Ausgang ist kein
// Beweis, sondern eine Behauptung. `--ohne-naht` schaltet dem Tor die
// Messstelle ab, an der es haengt, und verlangt damit die 2.
export const OHNE_NAHT = process.argv.includes('--ohne-naht');

export function messstelle(name, gruen) {
  const befunde = [], ungemessen = [];
  return {
    befund: (t) => befunde.push(t),
    ungemessen: (t) => ungemessen.push(t),
    hatBefund: () => befunde.length > 0,
    // Urteil sprechen und aussteigen. Kehrt nie zurueck.
    urteil(zusatz) {
      // Ungemessenes wird IMMER gezeigt, auch neben Befunden: sonst liest
      // sich ein roter Lauf so, als waere der Rest in Ordnung gewesen.
      if (ungemessen.length) {
        console.log(`\n⚠ ${name}: ${ungemessen.length}x NICHT GEMESSEN — der Apparat hat keine Zahl geliefert.`);
        for (const u of ungemessen) console.log('   ~ ' + u);
      }
      if (befunde.length) {
        console.log(`\n${name.toUpperCase()} ROT — ${befunde.length} Befund(e):`);
        // 40 statt 12: bei zwoelf verschwand der Befund zu genau der Datei,
        // um die es gerade ging — die Reihenfolge ist alphabetisch, nicht
        // nach Wichtigkeit. Ein abgeschnittener Befund liest sich wie keiner.
        for (const b of befunde.slice(0, 40)) console.log('  · ' + b);
        if (befunde.length > 40) console.log(`  … und ${befunde.length - 40} weitere`);
        process.exit(1);
      }
      if (ungemessen.length) {
        console.log(`\n${name.toUpperCase()} GRÜN, soweit gemessen — aber nicht vollstaendig gemessen.`);
        process.exit(2);
      }
      if (zusatz) console.log(zusatz);
      console.log(`\n${name.toUpperCase()} GRÜN — ${gruen}`);
      process.exit(0);
    },
    // Der Apparat ist gar nicht erst angesprungen: kein Teilergebnis, nichts.
    // Sofort aussteigen, damit hinter dieser Stelle nicht auf undefinierten
    // Daten weitergerechnet wird.
    abbruch(grund) {
      console.log(`\n⚠ ${name}: NICHT GEMESSEN — ${grund}`);
      console.log(`${name.toUpperCase()} sagt nichts. Das ist kein bestandener Lauf.`);
      process.exit(2);
    },
  };
}

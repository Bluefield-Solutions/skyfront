// Verkleinert den Bildvorrat in src/assets.js an Ort und Stelle.
//   node tools/bilder.mjs [--trocken]
//
// Betroffen sind nur die WebP-Bahnen: 22 Stueck tragen 15,39 der 15,75 MB,
// die 45 PNG-Sprites zusammen nur 0,31 MB. Die bleiben unangetastet — an
// harten Sprite-Kanten waere ein Neucodieren Risiko ohne nennenswerten Gewinn.
//
// Qualitaet 78 ist gemessen, nicht geraten: 42 bis 48 % kleiner bei einem
// mittleren Kanalfehler um 1 % (groesster Ausreisser 25 von 255). Drei
// Ausschnitte nebeneinander gelegt — Original, q78, q70 — zeigten keinen
// sichtbaren Unterschied. q70 waere nochmal 8 % kleiner gewesen; die habe ich
// liegen lassen.
//
// Neucodieren kostet bei verlustbehafteten Bildern jedes Mal Qualitaet.
// Deshalb wird nur uebernommen, was mindestens SCHWELLE kleiner wird: ein
// zweiter Lauf findet nichts mehr und richtet auch nichts an.
//
// Das Ergebnis wird eingecheckt. Wer src/assets.js aus einem Build neu
// gewinnt, muss das hier erneut laufen lassen.
import { readFileSync, writeFileSync } from 'fs';
import sharp from 'sharp';

const TROCKEN = process.argv.includes('--trocken');
const QUALITAET = 78;
const SCHWELLE = 0.08;      // unter 8 % Ersparnis nicht anfassen
const PHASER_EIGEN = 3;     // [0] und [2] sind Bruchstuecke, [1] Phasers Ersatzbild

const roh = readFileSync('src/assets.js', 'utf8');
const auf = roh.indexOf('['), zu = roh.lastIndexOf(']');
const liste = JSON.parse(roh.slice(auf, zu + 1));

let vorher = 0, nachher = 0, geaendert = 0, uebersprungen = 0;
for (let n = 0; n < liste.length; n++) {
  const e = liste[n];
  const komma = e.indexOf(',');
  if (komma < 0) { vorher += e.length; nachher += e.length; continue; }
  const alt = Buffer.from(e.slice(komma + 1), 'base64');
  vorher += alt.length;

  if (n < PHASER_EIGEN || !e.startsWith('data:image/webp')) { nachher += alt.length; continue; }

  let neu;
  try { neu = await sharp(alt).webp({ quality: QUALITAET, effort: 5 }).toBuffer(); }
  catch (f) { console.log(`  [${n}] nicht lesbar, bleibt: ${f.message}`); nachher += alt.length; continue; }

  const ersparnis = 1 - neu.length / alt.length;
  if (ersparnis < SCHWELLE) {
    uebersprungen++; nachher += alt.length;
    console.log(`  [${String(n).padStart(2)}] ${(alt.length/1024).toFixed(0).padStart(5)} KB  nur ${(ersparnis*100).toFixed(0)} % — bleibt`);
    continue;
  }
  liste[n] = 'data:image/webp;base64,' + neu.toString('base64');
  nachher += neu.length; geaendert++;
  console.log(`  [${String(n).padStart(2)}] ${(alt.length/1024).toFixed(0).padStart(5)} KB → ${(neu.length/1024).toFixed(0).padStart(5)} KB  (${(ersparnis*100).toFixed(0)} %)`);
}

console.log(`\n${geaendert} verkleinert, ${uebersprungen} zu wenig Gewinn, Rest unberuehrt.`);
console.log(`Bilder gesamt: ${(vorher/1048576).toFixed(2)} MB → ${(nachher/1048576).toFixed(2)} MB`);

if (TROCKEN) { console.log('(--trocken: nichts geschrieben)'); process.exit(0); }
writeFileSync('src/assets.js', roh.slice(0, auf) + JSON.stringify(liste) + roh.slice(zu + 1));
console.log('✓ src/assets.js geschrieben.');

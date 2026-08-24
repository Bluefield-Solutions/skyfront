#!/usr/bin/env node
/*
  Macht aus einer gelieferten Symbolvorlage eine RANDLOSE.

    node tools/symbolquelle.mjs <bild.png> [--feld=X,Y,S] [--radius=R]

  Warum das noetig ist: iOS legt ueber ein apple-touch-icon seine eigene
  abgerundete Maske (gemessen rund 22,4 % Eckradius). Eine Vorlage, die ihre
  eigene Rundung mitbringt, ergibt auf dem Homescreen eine Rundung in einer
  Rundung, mit ihrem Untergrund als Rahmen dazwischen.

  Weggeschnitten wird moeglichst wenig — bei der ersten Vorlage reichte der
  Flieger bis dicht an den oberen Rand, ein Beschnitt haette die Nase gekappt.
  Stattdessen werden die vier Ecken GEFUELLT: dasselbe Bild, leicht
  vergroessert und weichgezeichnet. Dort liegt Himmel; die Fuellung setzt ihn
  fort, statt ihn zu erfinden.

  WARUM DAS FELD ANGEGEBEN WIRD UND NICHT ERKANNT:

  Drei Anlaeufe, es zu messen, gingen daneben — und alle drei sahen dabei aus
  wie eine Messung. Auf 16 % Hoehe kruemmt die Ecke noch (122 statt 76). Auf
  halber Hoehe laeuft die Zeile durch die Tragflaechen und findet deren Kante
  statt der des Feldes (213 statt 84). Die Glaskante ist weich, ein Schwellwert
  von 40 auf dem Vorwaertsunterschied uebersieht sie. Beim vierten Mal haette
  ich eine Schwelle gesucht, die zu DIESEM Bild passt — und genau das waere
  keine Erkennung mehr, sondern eine als Erkennung verkleidete Angabe.

  Also lieber ehrlich: die Geometrie wird angegeben, und das ERGEBNIS wird
  geprueft. Die Ringpruefung in tools/symbol.mjs weist eine Vorlage ab, die
  noch einen Rand hat — die kann nicht daneben liegen, weil sie nicht das
  Feld sucht, sondern nachsieht, ob am Rand Inhalt liegt.
*/
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';

const EIN = process.argv[2];
const AUS = 'web/quelle/icon-quelle.png';
const ZIEL = 1024;          // groesste erzeugte Fassung; mehr braucht niemand
const ZOOM = 1.22;          // so weit wird fuer die Eckfuellung aufgezogen

// Gemessen an der ersten Vorlage (1254 x 1254): das Glasfeld liegt bei
// 76..1178 senkrecht und 84..1170 waagerecht, Eckradius rund 226. Genommen
// wird der engere der beiden Werte, damit nirgends Untergrund stehen bleibt.
const VORGABE = { x: 84, y: 84, s: 1086, r: 218 };

const wert = (name) => {
  const a = process.argv.find((z) => z.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3).split(',').map(Number) : null;
};

if (!EIN || !existsSync(EIN)) {
  console.error('✗ Bitte eine Bilddatei angeben: node tools/symbolquelle.mjs <bild.png>');
  process.exit(1);
}

const f = wert('feld'), rr = wert('radius');
const X = f ? f[0] : VORGABE.x, Y = f ? f[1] : VORGABE.y, S = f ? f[2] : VORGABE.s;
const R = rr ? rr[0] : VORGABE.r;

const q = await sharp(EIN).metadata();
if (X + S > q.width || Y + S > q.height) {
  console.error(`✗ Feld ${X},${Y} ${S}x${S} passt nicht in ein Bild von ${q.width}x${q.height}.`);
  console.error('  Bei einer anderen Vorlage das Feld mit --feld=X,Y,S und --radius=R angeben.');
  process.exit(1);
}
console.log(`  Vorlage ${q.width}x${q.height} · Feld ${X},${Y} ${S}x${S} · Eckradius ${R} (${(R / S * 100).toFixed(1)} %)`);

const feld = await sharp(EIN).extract({ left: X, top: Y, width: S, height: S }).png().toBuffer();
const gross = Math.round(S * ZOOM);
const grund = await sharp(feld).resize(gross, gross)
  .extract({ left: Math.round((gross - S) / 2), top: Math.round((gross - S) / 2), width: S, height: S })
  .blur(18).png().toBuffer();
const maske = Buffer.from(`<svg width="${S}" height="${S}"><rect width="${S}" height="${S}" rx="${R}" ry="${R}" fill="#fff"/></svg>`);
const feldFrei = await sharp(feld).composite([{ input: maske, blend: 'dest-in' }]).png().toBuffer();

mkdirSync('web/quelle', { recursive: true });
// Erst zusammensetzen, DANN verkleinern — sharp rechnet das Verkleinern
// sonst vor dem Zusammensetzen und die Auflage passt nicht mehr auf den Grund.
const fertig = await sharp(grund).composite([{ input: feldFrei }])
  .flatten({ background: '#0a1a2e' }).removeAlpha().png().toBuffer();
await sharp(fertig).resize(ZIEL, ZIEL, { kernel: 'lanczos3' })
  .png({ compressionLevel: 9, effort: 10 }).toFile(AUS);

const m = await sharp(AUS).metadata();
console.log(`✓ ${AUS} — ${m.width}x${m.height}, ohne Durchsichtigkeit`);
console.log('  Weiter mit: node tools/symbol.mjs (prueft, ob wirklich kein Rand mehr da ist)');

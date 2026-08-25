#!/usr/bin/env node
/*
  Prueft gelieferte Rohbilder gegen den Auftrag.

    node tools/bildpruefung.mjs

  Der Anlass: die erste Lieferung der fuenf Bosse traf die Gestaltung, aber
  nicht die Masse — alle fuenf kamen im selben Hochformat, und die
  Detaildichte lag damit auf dem Stand der alten Bilder. Aufgefallen ist das
  erst beim Nachmessen von Hand. Beim naechsten Mal soll es in Sekunden
  auffallen, nicht in einer halben Stunde.

  WAS GEMESSEN WIRD — und warum nicht die Dateigroesse:

  Ein Bild kann 1300 Bildpunkte breit sein und der Boss darin 400. Gezaehlt
  wird deshalb der INHALT (die Ausdehnung der deckenden Punkte), nicht das
  Blatt. Genau das war hier der Fall: die Blaetter sind 290 bis 366 breit,
  der Inhalt 290 bis 353.
*/
import sharp from 'sharp';
import { existsSync, readdirSync } from 'node:fs';
import { messstelle } from './messstelle.mjs';

const M = messstelle('Bildpruefung', 'jede Lieferung haelt den Auftrag ein.');

// Der Auftrag, in Zahlen. Quelle: docs/BILDAUFTRAEGE-BOSSE.md.
// Wer dort etwas aendert, aendert es hier mit — sonst prueft dieses
// Werkzeug einen Auftrag, den es nicht mehr gibt.
const AUFTRAG = {
  boss_sturmkanzel:   { breite:  850, hoehe:  625 },
  // breiterOk: fuer diesen einen darf das Bild FLACHER ausfallen als
  // bestellt, nicht aber schmaler. Grund: der Nurfluegel soll ausdruecklich
  // "sehr breit, sehr flach" sein, und das ist die Richtung, in die der
  // Prompt schiebt. Geliefert kam 2,55 statt 2,05 — 24 % zu flach. Die
  // Breite, an der die Schaerfe haengt, ist damit uebererfuellt (1882 statt
  // 1075); nur die Tiefe faellt geringer aus (169 statt 210 Weltpunkten im
  // Bild). Das ist eine Gestaltungsfrage, kein Fehler.
  //
  // Die Ausnahme ist mit ABSICHT gerichtet und nicht als groessere Toleranz
  // geschrieben: ein Hochformat, der Fehler des ersten Anlaufs, schlaegt
  // weiterhin an. Gegengeprobt am um 90 Grad gedrehten Bild.
  boss_schwarmmutter: { breite: 1075, hoehe:  525, breiterOk: true },
  boss_lanzentraeger: { breite:  650, hoehe: 1000 },
  boss_ringfestung:   { breite: 1150, hoehe: 1150 },
  boss_ambosskreuzer: { breite: 1300, hoehe: 1000 },
};

// Ist in dem Bild bei SEINER Groesse wirklich Detail — oder ist es schon
// hochgerechnet?
//
// Ohne diese Frage waere die Groessenpruefung oben wertlos: man bestuende
// sie, indem man das zu kleine Bild einfach aufzieht. Genau das ist der
// naheliegende Pfusch, und er faellt sonst niemandem auf.
//
// Die Probe: halbieren und wieder aufziehen. Steckt echtes Detail drin, geht
// dabei etwas verloren; ist es bereits hochgerechnet, nicht. Gemessen:
//   geliefertes Bild, nativ 325 px      0,704
//   dasselbe, auf 850 gezogen           0,953
//   boss3, nativ 425 px                 0,816
// 0,90 liegt zwischen beiden Gruppen, mit Abstand nach beiden Seiten.
const RUNDLAUF_MAX = .90;

const ORDNER = 'art/roh/boss';
const RAND_MIN = 6;        // durchsichtiger Rand fuer Saum und Kantenlicht
const SEITE_TOLERANZ = .15;

if (!existsSync(ORDNER)) M.abbruch(`${ORDNER} fehlt — nichts zu pruefen.`);

// Die Vergleichszahl fuer die Detaildichte kommt aus den Bildern, die HEUTE
// im Spiel sind. Ein festes Soll waere hier falsch: wie dicht ein Bild ist,
// haengt am Motiv. Was zaehlt, ist "nicht schlechter als das, was ersetzt
// werden soll".
const VERGLEICHSBREITE = 650;

async function dichte(datei, breite) {
  const m = await sharp(datei).metadata();
  const h = Math.max(1, Math.round(m.height * breite / m.width));
  const { data, info } = await sharp(datei).ensureAlpha()
    .resize(breite, h, { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const L = (x, y) => { const i = (y * W + x) * C; return .2126 * data[i] + .7152 * data[i + 1] + .0722 * data[i + 2]; };
  const A = (x, y) => data[(y * W + x) * C + 3];
  let s = 0, n = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (A(x, y) < 200) continue;
    // Nur INNEN: der Umriss selbst ist immer ein Sprung und wuerde die Zahl
    // in Richtung "scharf" ziehen, egal wie flau das Bild darunter ist.
    if (A(x - 1, y) < 200 || A(x + 1, y) < 200 || A(x, y - 1) < 200 || A(x, y + 1) < 200) continue;
    const gx = Math.abs(L(x + 1, y) - L(x - 1, y)), gy = Math.abs(L(x, y + 1) - L(x, y - 1));
    s += Math.sqrt(gx * gx + gy * gy) / 255; n++;
  }
  return n ? s / n : 0;
}

async function inhalt(datei) {
  const { data, info } = await sharp(datei).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (data[(y * W + x) * C + 3] < 24) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return null;
  return { x0, y0, x1, y1, breite: x1 - x0 + 1, hoehe: y1 - y0 + 1, blatt: [W, H] };
}

const dateien = readdirSync(ORDNER).filter((f) => f.endsWith('.png'));
if (!dateien.length) M.abbruch(`keine PNG in ${ORDNER}.`);

console.log(`Bildpruefung — ${dateien.length} Datei(en) in ${ORDNER}\n`);
console.log('  Datei                    Blatt        Inhalt       Soll         Seite Ist/Soll   Dichte');

for (const f of dateien.sort()) {
  const name = f.replace(/\.png$/, '');
  const soll = AUFTRAG[name];
  const pfad = `${ORDNER}/${f}`;
  const m = await sharp(pfad).metadata();

  if (!soll) { M.ungemessen(`${f}: steht nicht im Auftrag — kein Soll, keine Aussage.`); continue; }
  if (!m.hasAlpha) M.befund(`${f}: kein Alphakanal. Freigestellt heisst durchsichtig, nicht weiss.`);

  const i = await inhalt(pfad);
  if (!i) { M.ungemessen(`${f}: kein deckender Bildpunkt gefunden.`); continue; }

  const d = await dichte(pfad, VERGLEICHSBREITE);
  const sIst = i.breite / i.hoehe, sSoll = soll.breite / soll.hoehe;
  console.log(`  ${f.padEnd(24)} ${(m.width + 'x' + m.height).padEnd(12)} ${(i.breite + 'x' + i.hoehe).padEnd(12)} ${(soll.breite + 'x' + soll.hoehe).padEnd(12)} ${(sIst.toFixed(2) + ' / ' + sSoll.toFixed(2)).padEnd(13)} ${d.toFixed(4)}`);

  // 1. Der INHALT muss die verlangte Ausdehnung haben, nicht das Blatt.
  if (i.breite < soll.breite || i.hoehe < soll.hoehe)
    M.befund(`${f}: Inhalt ${i.breite}x${i.hoehe}, verlangt ${soll.breite}x${soll.hoehe} — im Spiel wird es hochgerechnet (${(i.breite / soll.breite).toFixed(2)}x / ${(i.hoehe / soll.hoehe).toFixed(2)}x).`);

  // 2. Das Seitenverhaeltnis. Es entscheidet ueber die FORM: ein breiter
  //    Nurfluegel im Hochformat ist kein breiter Nurfluegel.
  const ab = Math.abs(sIst - sSoll) / sSoll;
  const flacher = sIst > sSoll;               // breiter im Verhaeltnis zur Tiefe
  if (ab > SEITE_TOLERANZ && !(flacher && soll.breiterOk))
    M.befund(`${f}: Seitenverhaeltnis ${sIst.toFixed(2)} statt ${sSoll.toFixed(2)} (${Math.round(ab * 100)} % daneben). Das Format wird im Werkzeug eingestellt, nicht im Prompttext.`);
  else if (ab > SEITE_TOLERANZ)
    // Kein Befund, aber auch nicht stillschweigend: eine hingenommene
    // Abweichung, die man sehen koennen muss.
    console.log(`     ↳ ${Math.round(ab * 100)} % flacher als bestellt — fuer diesen Auftrag zugelassen (breiterOk).`);

  // 3. Steckt bei dieser Groesse echtes Detail drin?
  const nativ = await dichte(pfad, m.width);
  const halb = await sharp(pfad).resize(Math.max(2, Math.round(m.width / 2))).png().toBuffer();
  const rund = await dichte(await sharp(halb).resize(m.width, m.height, { kernel: 'lanczos3' }).png().toBuffer(), m.width);
  const verh = nativ > 0 ? rund / nativ : 1;
  if (verh >= RUNDLAUF_MAX)
    M.befund(`${f}: das Bild ist bei ${m.width} px selbst schon hochgerechnet (Rundlauf ${verh.toFixed(3)}, Grenze ${RUNDLAUF_MAX}). Ein kleines Bild aufzuziehen macht es nicht groesser, nur weicher.`);

  // 4. Rand fuer Saum und Kantenlicht.
  const rand = Math.min(i.x0, i.y0, m.width - 1 - i.x1, m.height - 1 - i.y1);
  if (rand < RAND_MIN)
    M.befund(`${f}: nur ${rand} Bildpunkte durchsichtiger Rand, ${RAND_MIN} noetig — Saum und Kantenlicht brauchen Platz.`);
}

M.urteil();

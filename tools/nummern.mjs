#!/usr/bin/env node
/*
  Belegt eine SKY-Nummer zwei verschiedene Dinge?

    node tools/nummern.mjs

  Der Anlass: neun Nummern taten genau das. SKY-051 war zugleich „Kein
  sichtbarer Schadenszustand" (Boss) und „das App-Symbol". Wer nach einer
  Nummer sucht, fand zwei Sachen — und wer eine abhakt, hakt vielleicht die
  falsche ab.

  Wie es passieren konnte: es gibt ZWEI Ticketquellen. Teil Y ist eine
  Tabelle mit 55 Nummern (SKY-001 bis SKY-152), Teil Z hat zehn
  ausformulierte Tickets. Die Nachtraege zaehlten danach einfach weiter — an
  beiden vorbei.

  WARUM DIESE PRUEFUNG NICHT SELBST URTEILT:

  Der erste Anlauf verglich Beschreibungen und fragte, ob sie „vom selben
  reden". Er meldete sechs Fehlalarme: die Tabelle nennt das PROBLEM
  („Chiptune widerspricht der Zielrichtung"), die Ueberschrift die LOESUNG
  („Klangidentitaet"). Zwei Formulierungen desselben Tickets teilen kaum ein
  Wort. Eine Pruefung, die meldet, was in Ordnung ist, wird binnen zweier
  Runden ignoriert — dann ist sie gar keine mehr.

  Also urteilt sie nicht. Jede Nummer, die ein NACHTRAG belegt, muss hier
  eingetragen sein: entweder als Fortschreibung ihres eigenen Tickets oder
  als bekannte Altlast. Alles andere ist rot. Das kann nicht danebenliegen,
  weil es nichts einschaetzt — es haelt nur fest, was einmal entschieden
  wurde.
*/
import { readFileSync, readdirSync } from 'node:fs';

// Nachtraege, die IHR EIGENES Ticket fortschreiben. Kein Fehler.
const FORTSCHREIBUNG = {
  'SKY-008': 'Messung auf echter Hardware — Nachtrag v5 setzt sie fort',
  'SKY-010': 'Feuerkraft im Gefecht — Nachtrag v5 setzt es um',
  'SKY-029': 'Faerbung/Kennfarbe — Nachtrag v8 baut die Kennleuchte',
  'SKY-033': 'Nur 6 Formationen — Nachtrag v11 baut vier eigene',
  'SKY-009': 'Silhouetten/Lesbarkeit — Nachtrag v6 misst nach',
  'SKY-025': 'Nur vier unterscheidbare Silhouetten — Nachtrag v6 misst beide Gruppen',
};

// Bekannte Doppelbelegungen: die Nummer bezeichnet ZWEI verschiedene Dinge.
// Umnummerieren hiesse, Ueberschriften zu aendern, auf die Commits und
// Dokumente verweisen. Deshalb hingenommen und hier festgehalten — wer eine
// aufloest, streicht sie, dann faellt sie beim naechsten Lauf wieder auf.
const ALTLASTEN = {
  'SKY-031': 'Register: Schlachttraeger stoesst keine Gegner aus · Nachtrag v9: Formationentafel',
  'SKY-032': 'Register: Bomber/Kanonenboot zahlenverschieden · Nachtrag v9b: zwei tote Pruefungen',
  'SKY-041': 'Teil Z: verbindliches Groessensystem · Nachtrag v15: Messtafel',
  'SKY-042': 'Register: kein Aufloesungsstandard · Nachtrag v16: die Kolonne',
  'SKY-043': 'Register: Begleitflieger sind Spielerkopien · Nachtrag v16b: B1 geschaerft',
  'SKY-044': 'Register: keine Art Bible · Nachtrag v17: Kennleuchten auf hellen Biomen',
  'SKY-050': 'Teil Z: modulare Bosse · Nachtrag v19b: Bildboden im Formentor',
  'SKY-051': 'Register: kein sichtbarer Schadenszustand · Nachtrag v20: App-Symbol',
  'SKY-052': 'Register: kein Boss-Intro · Nachtrag v21: Kantenlicht und Ladeschirm',
};

const FREI_AB = 210;   // darunter ist alles vergeben

const dateien = readdirSync('docs').filter((f) => f.endsWith('.md')).map((f) => 'docs/' + f);
const vergeben = new Set();       // aus Tabelle und Teil-Z-Ueberschriften
const nachtraege = [];            // [Nummer, Titel, Datei]

for (const d of dateien) {
  const text = readFileSync(d, 'utf8');
  for (const m of text.matchAll(/^\| (SKY-\d{3}) \|/gm)) vergeben.add(m[1]);
  // Die Kurzform "SKY-049/050" muss mitgelesen werden: die zweite Zahl
  // steht dort OHNE Vorsatz. Der erste Anlauf las nur SKY-049 und meldete
  // dann SKY-050 als "Eintrag ohne Nachtrag" — eine Luecke, die aussah wie
  // eine erledigte Altlast.
  for (const m of text.matchAll(/^#{2,4} (SKY-\d{3}(?:\s*\/\s*(?:SKY-)?\d{3})*)\s*— ([^\n]+)/gm)) {
    const nummern = (m[1].match(/\d{3}/g) || []).map((x) => 'SKY-' + x);
    const titel = m[2].trim();
    if (/^Nachtrag /.test(titel)) for (const n of nummern) nachtraege.push([n, titel, d]);
    else for (const n of nummern) vergeben.add(n);
  }
}

console.log(`Nummernpruefung — ${vergeben.size} vergebene Nummern · ${nachtraege.length} Nachtragsbelegungen\n`);

const offen = [];
for (const [nr, titel, d] of nachtraege) {
  if (!vergeben.has(nr)) continue;                 // Nummer war frei — in Ordnung
  if (FORTSCHREIBUNG[nr] || ALTLASTEN[nr]) continue;
  offen.push([nr, titel, d]);
}

const alt = Object.keys(ALTLASTEN).filter((n) => nachtraege.some(([x]) => x === n));
if (alt.length) {
  console.log(`  ${alt.length} bekannte Doppelbelegung(en), hingenommen:`);
  for (const n of alt) console.log(`    ${n}  ${ALTLASTEN[n]}`);
  console.log('');
}
const hoechste = Math.max(...[...vergeben].map((n) => Number(n.slice(4))));
console.log(`  Hoechste vergebene Nummer: SKY-${String(hoechste).padStart(3, '0')} · frei ab SKY-${FREI_AB}`);

// Und die andere Richtung: eine Altlast, die es nicht mehr gibt, ist ein
// Eintrag, der etwas festhaelt, das keiner mehr prueft.
const tot = Object.keys(ALTLASTEN).filter((n) => !nachtraege.some(([x]) => x === n));
if (tot.length) console.log(`\n  (i) ${tot.length} Eintrag/Eintraege ohne Nachtrag im Dokument: ${tot.join(' ')} — aufgeloest? Dann hier streichen.`);

if (offen.length) {
  console.log(`\nNUMMERN ROT — ${offen.length} unangemeldete Doppelbelegung(en):`);
  for (const [nr, titel, d] of offen)
    console.log(`  · ${nr} ist schon vergeben und wird hier erneut benutzt: „${titel}" (${d})`);
  console.log(`\n  Entweder eine freie Nummer ab SKY-${FREI_AB} nehmen — oder, wenn es`);
  console.log('  wirklich dasselbe Ticket ist, in FORTSCHREIBUNG eintragen.');
  process.exit(1);
}
console.log('\nNUMMERN GRÜN — jede Nachtragsnummer ist angemeldet.');

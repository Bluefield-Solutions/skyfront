#!/usr/bin/env node
/*
  Musik — was laeuft da eigentlich, in Zahlen?

    node tools/musik.mjs

  DER ANLASS: „Musik soll einfach passend sein fuer so ein Spiel. Nicht
  einfach so kleines Rumgedudel. Anstaendige Musik."

  „Rumgedudel" ist ein Urteil. Damit man darueber reden kann, braucht es
  Zahlen: wie lang ist die Schleife, wie oft wiederholt sie sich in einem
  Sektor, aus wievielen Stimmen besteht sie, und wieviele verschiedene
  Toene kommen darin vor.

  WOHER DIE ZAHLEN KOMMEN: aus der Notentabelle und dem Taktgeber des
  Spiels selbst (Pi und der setInterval-Wert in startMusic), gelesen aus
  src/app.js. Gespielt wird dafuer nichts — eine Schleifenlaenge braucht
  kein Ohr.

  WAS DAS NICHT SAGT: ob es gut klingt. Eine 9-Sekunden-Schleife kann
  grossartig sein. Aber sie bleibt eine 9-Sekunden-Schleife, und das ist
  eine Tatsache, ueber die man nicht streiten muss.
*/
import { readFileSync, existsSync } from 'node:fs';
import { messstelle } from './messstelle.mjs';

const M = messstelle('Musik', 'die Schleife wiederholt sich nicht oefter je Sektor als das Band erlaubt.');
// Wieviele Wiederholungen ertraegt ein Sektor? Die Zahl ist gesetzt, nicht
// gemessen — und sie steht hier, damit man ihr widersprechen kann: ab der
// achten Wiederholung desselben Achttakters hoert man die Naht, und ab da
// hoert man nur noch sie.
const OBEN = 8;

if (!existsSync('src/app.js')) M.abbruch('src/app.js fehlt.');
const quelle = readFileSync('src/app.js', 'utf8');

const takt = /this\.timer = window\.setInterval\(\(\) => this\.tick\(\), (\d+)\)/.exec(quelle);
if (!takt) M.abbruch('der Taktgeber (setInterval in startMusic) ist nicht zu finden.');
const MS = Number(takt[1]);

const laenge = /const R = this\.step % (\d+)/.exec(quelle);
if (!laenge) M.abbruch('die Schleifenlaenge (this.step % N) ist nicht zu finden.');
const SCHRITTE = Number(laenge[1]);

const block = /const nn = \[[\s\S]*?\n    \};/.exec(quelle);
if (!block) M.abbruch('die Notentabelle Pi ist nicht zu finden.');

// Je Modus: die zwei geschriebenen Stimmen.
const modi = [];
for (const m of block[0].matchAll(/(\w+): \{\s*bass: (\[[^\]]*\]|\w+),\s*lead: (\[[^\]]*\]|\w+)\s*\}/g)) {
  const zahl = (t) => t.startsWith('[') ? JSON.parse(t) : null;
  modi.push({ name: m[1], bass: zahl(m[2]), lead: zahl(m[3]) });
}
if (!modi.length) M.abbruch('kein einziger Musikmodus gelesen.');

// Das Schlagzeug steht als Code, nicht als Tabelle: kick, snare, hat.
const schlag = ['kick', 'snare', 'hat'].filter((s) => new RegExp(`this\\.${s}\\(\\)`).test(quelle));

const sek = SCHRITTE * MS / 1000;
const bpm = Math.round(60 / (MS / 1000) / 4);
console.log('Musik — Schleife, Stimmen, Tonvorrat\n');
console.log(`  Taktgeber:      ${MS} ms je Schritt  →  ${bpm} Schlaege je Minute`);
console.log(`  Schleife:       ${SCHRITTE} Schritte  →  ${sek.toFixed(2)} s bis zur Wiederholung`);
console.log(`  Schlagzeug:     ${schlag.join(', ') || '—'}\n`);
console.log('  Modus     Stimmen   Toene gesetzt   verschiedene Tonhoehen   Umfang');
for (const m of modi) {
  if (!m.bass || !m.lead) { console.log(`  ${m.name.padEnd(9)} (aus Bausteinen gerechnet — nicht als Tabelle lesbar)`); continue; }
  const noten = [...m.bass, ...m.lead].filter((n) => n > 0);
  const hoehen = [...new Set(noten)];
  console.log(`  ${m.name.padEnd(9)} ${String(2 + schlag.length).padStart(7)}   ${String(noten.length).padStart(13)}   `
    + `${String(hoehen.length).padStart(22)}   ${Math.min(...hoehen)}–${Math.max(...hoehen)}`);
}

// Wie oft hoert man dieselbe Schleife in einem Sektor? Die Sektorlaengen
// stehen nicht hier, sondern in der Zeitachse — genommen wird die
// gemessene Spanne von dort (v46: kuerzester 78 s, laengster 139 s).
const KURZ = 78, LANG = 139;
console.log(`\n  In einem Sektor von ${KURZ} s:  ${(KURZ / sek).toFixed(1)} Wiederholungen`);
console.log(`  In einem Sektor von ${LANG} s: ${(LANG / sek).toFixed(1)} Wiederholungen`);
console.log(`  Band: hoechstens ${OBEN}.`);

const oft = LANG / sek;
if (oft > OBEN)
  M.befund(`die Schleife ist ${sek.toFixed(1)} s lang und wiederholt sich im laengsten Sektor ${oft.toFixed(0)} Mal `
    + `(erlaubt ${OBEN}). Ab der achten Wiederholung hoert man die Naht, und ab da hoert man nur noch sie.`);

M.urteil();

#!/usr/bin/env node
/*
  Musikeinbau — die gerenderten Stuecke in den Vorrat schreiben.

    node tools/musikeinbau.mjs

  Liest art/musik/*.mp3 und schreibt src/musik.js: ein Objekt __SKFM, in
  dem jeder Spielmodus seine Datei als data:-Adresse findet.

  WARUM EINE EIGENE DATEI und nicht das Bilderfeld __SKFA: dort sind die
  Nummern Positionen, die app.js anspringt (eiserne Regel 9 — ein Eintrag
  darf geleert, aber nie entfernt werden). Musik hat keine Positionen,
  sondern Namen; sie gehoert nicht in dieselbe Liste.

  DIE ZUORDNUNG: die Stuecke heissen nach dem, was sie sind (menue,
  gefecht, boss), das Spiel kennt seine Modi (menu, normal, boss). Die
  Uebersetzung steht hier und nur hier.
*/
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { messstelle } from './messstelle.mjs';

const M = messstelle('Musikeinbau', 'jeder Spielmodus hat sein Stueck im Vorrat.');
const ZUORDNUNG = { menu: 'menue', normal: 'gefecht', boss: 'boss' };
// Was ein Stueck hoechstens wiegen darf. 1,6 MB je Datei sind bei
// 112 kbit/s rund zwei Minuten — laenger braucht kein Loop, und drei
// davon sind als base64 rund 6 MB in der HTML-Datei.
const MAX_KB = 1600;

const teile = [];
for (const [modus, datei] of Object.entries(ZUORDNUNG)) {
  const p = `art/musik/${datei}.mp3`;
  if (!existsSync(p)) { M.ungemessen(`${p} fehlt — Modus "${modus}" bleibt beim erzeugten Klang.`); continue; }
  const roh = readFileSync(p);
  const kb = Math.round(roh.length / 1024);
  if (kb > MAX_KB) M.befund(`${p} ist ${kb} KB gross, erlaubt sind ${MAX_KB}. In einer autarken Datei zaehlt jedes Megabyte.`);
  teile.push({ modus, datei, kb, b64: roh.toString('base64') });
}

if (!teile.length) M.abbruch('kein einziges Stueck gefunden — erst python3 tools/musikbacken.py.');

const inhalt = '/* AUTOGENERIERT von tools/musikeinbau.mjs. Nicht editieren. */\n'
  + 'var __SKFM={' + teile.map((t) => `${t.modus}:"data:audio/mpeg;base64,${t.b64}"`).join(',') + '};\n'
  + 'window.__SKFM=__SKFM;\n';
writeFileSync('src/musik.js', inhalt);

console.log('Musikeinbau\n');
console.log('  Modus     Stueck      MP3        in der Datei');
let summe = 0;
for (const t of teile) {
  const b = Math.round(t.b64.length / 1024);
  summe += b;
  console.log(`  ${t.modus.padEnd(9)} ${t.datei.padEnd(11)} ${String(t.kb).padStart(5)} KB   ${String(b).padStart(6)} KB`);
}
console.log(`\n  src/musik.js: ${Math.round(statSync('src/musik.js').size / 1024)} KB  (base64 waechst um ein Drittel)`);
if (teile.length < Object.keys(ZUORDNUNG).length)
  M.ungemessen(`nur ${teile.length} von ${Object.keys(ZUORDNUNG).length} Modi haben ein Stueck.`);

M.urteil();

#!/usr/bin/env node
/*
  Versionswächter.

  Die Spielversion steht an EINER Stelle (`SKF_VERSION` in src/app.js) und
  wird vom Bau in die HTML-Hülle gestempelt. Damit kann sie nicht auseinander
  laufen — aber sie kann STEHENBLEIBEN, während die Arbeit weitergeht. Eine
  Versionszeile, die immer dasselbe zeigt, ist schlimmer als gar keine: sie
  behauptet etwas.

  Deshalb zählt sie mit den Nachträgen im Auditbericht. Wer einen Nachtrag
  schreibt, hat etwas geliefert; dann muss die Version mit.

    node tools/version.mjs           prüft Quelle, Bericht und Bau
    node tools/version.mjs --setzen  hebt die Version auf den Bericht

  Geprüft wird zusätzlich am GEBAUTEN Spiel, dass die Zeile wirklich im
  Bild steht — ein Platzhalter, der nicht ersetzt wurde, sieht in der Quelle
  völlig in Ordnung aus.
*/
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const befunde = [];
const SETZEN = process.argv.includes('--setzen');

const quelle = readFileSync('src/app.js', 'utf8');
const mQ = /\bSKF_VERSION = "([^"]+)"/.exec(quelle);
if (!mQ) { console.error('✗ SKF_VERSION nicht in src/app.js gefunden.'); process.exit(1); }
const vQuelle = mQ[1];

// Der höchste Nachtrag im Auditbericht. "v12b" zählt als 12.
const bericht = readFileSync('docs/AUDIT-2026-08.md', 'utf8');
const nummern = [...bericht.matchAll(/Nachtrag v(\d+)/g)].map((m) => Number(m[1]));
if (!nummern.length) { console.error('✗ kein "Nachtrag vN" im Auditbericht gefunden.'); process.exit(1); }
const vBericht = 'v' + Math.max(...nummern);

console.log(`  Quelle  src/app.js        ${vQuelle}`);
console.log(`  Bericht docs/AUDIT-…md    ${vBericht}  (höchster Nachtrag)`);

if (SETZEN) {
  if (vQuelle === vBericht) { console.log('\n  Nichts zu tun.'); process.exit(0); }
  writeFileSync('src/app.js', quelle.replace(`SKF_VERSION = "${vQuelle}"`, `SKF_VERSION = "${vBericht}"`));
  console.log(`\n✓ src/app.js: ${vQuelle} → ${vBericht}. Jetzt neu bauen.`);
  process.exit(0);
}

if (vQuelle !== vBericht)
  befunde.push(`Version ${vQuelle} in src/app.js, aber der Bericht ist bei ${vBericht}. Mit "npm run version -- --setzen" heben.`);

// Und am gebauten Spiel: steht die Zeile wirklich drin?
if (!existsSync('dist/Skyfront.html')) {
  console.log('  (—) dist/Skyfront.html fehlt — der Bau wird nicht geprüft.');
} else {
  const gebaut = readFileSync('dist/Skyfront.html', 'utf8');
  const mB = /id="version">([^<]*)</.exec(gebaut);
  if (!mB) befunde.push('Im gebauten Spiel gibt es kein <div id="version"> — die Zeile ist nicht da.');
  else {
    const vBau = mB[1].trim();
    console.log(`  Bau     dist/Skyfront.html ${vBau || '(leer)'}`);
    if (vBau.includes('%%')) befunde.push(`Der Platzhalter wurde nicht ersetzt: "${vBau}".`);
    else if (!vBau) befunde.push('Die Versionszeile im Bau ist leer.');
    else if (vBau !== vQuelle) befunde.push(`Bau zeigt ${vBau}, Quelle sagt ${vQuelle}.`);
  }
}

// UND DAS RUECKSTANDSVERZEICHNIS.
//
// `docs/RUECKSTAND.md` ist die einzige Stelle, an der der Stand steht —
// und es stand vierzig Versionen lang auf „v28". Niemandem ist es
// aufgefallen, weil kein Tor es ansah: der Rueckstand des
// Rueckstandsverzeichnisses war selbst der laengste Rueckstand im
// Projekt.
//
// Die Grenze ist LOCKERER als bei Quelle und Bericht: ein Backlog muss
// nicht jede Version mitgehen, nur nicht davonlaufen. Sechs Versionen
// sind rund eine Arbeitsrunde.
{
  const R = 'docs/RUECKSTAND.md';
  if (!existsSync(R)) console.log('  (—) docs/RUECKSTAND.md fehlt — der Rueckstand wird nicht geprueft.');
  else {
    const mR = /^Stand:\s*v(\d+)\.?\s*$/m.exec(readFileSync(R, 'utf8'));
    const nQ = Number(/^v(\d+)$/.exec(vQuelle)?.[1]);
    if (!mR) befunde.push(`In ${R} steht keine Zeile der Form "Stand: vNN" — dann laesst sich sein Rueckstand nicht messen.`);
    else {
      const nR = Number(mR[1]);
      console.log(`  Rueckstand ${R.padEnd(18)} v${nR}`);
      if (Number.isFinite(nQ) && nQ - nR >= 6)
        befunde.push(`${R} steht auf v${nR}, das Spiel bei ${vQuelle} — ${nQ - nR} Versionen Rueckstand. Wer wissen will, was als Naechstes kommt, liest dort etwas Falsches.`);
    }
  }
}

console.log('');
if (befunde.length) {
  console.log('VERSION ROT:');
  for (const b of befunde) console.log('  · ' + b);
  process.exit(1);
}
console.log(`VERSION GRÜN — ${vQuelle}, in Quelle, Bericht und Bau dieselbe.`);

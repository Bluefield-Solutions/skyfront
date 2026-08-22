// Sammel-Build: Master + alle Varianten + Launcher.
//   node build-all.mjs           baut alles
//   node build-all.mjs --boot    zusätzlich echter Boot-Test (braucht Playwright)
//   node build-all.mjs --zip     zusätzlich ein verteilbares Skyfront-dist.zip
import { execSync } from 'child_process';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { makeZip } from './zip.mjs';

const args = process.argv.slice(2);
const boot = args.includes('--boot');
const zipArg = args.find(a => a === '--zip' || a.startsWith('--zip='));
const zip = !!zipArg;
const zipMode = zipArg && zipArg.includes('=') ? zipArg.split('=')[1] : 'all';   // 'all' | 'master'

console.log('▶ node build.mjs');
execSync('node build.mjs', { stdio: 'inherit' });

console.log('\n▶ node build-variants.mjs' + (boot ? ' --boot' : ''));
let variantsOk = true;
try {
  execSync('node build-variants.mjs' + (boot ? ' --boot' : ''), { stdio: 'inherit' });
} catch {
  variantsOk = false;
}

if (zip && !variantsOk) {
  console.error('\n✗ Qualitäts-Gate: Build/Boot nicht sauber — Skyfront-dist.zip wurde NICHT geschrieben.');
  process.exit(1);
}

if (zip && zipMode === 'master') {
  console.log('\n▶ packe Master → Skyfront-master.zip …');
  const readme =
`Skyfront — Master
==================

Losspielen: Skyfront.html im Browser öffnen (Doppelklick). Läuft offline,
ohne Installation. Dies ist nur die Master-Fassung; das volle Paket mit allen
Varianten entsteht mit  node build-all.mjs --zip .

Erstellt am ${new Date().toISOString().slice(0, 10)} mit build-all.mjs.
`;
  const entries = [
    { name: 'README.txt', data: Buffer.from(readme, 'utf8') },
    { name: 'Skyfront.html', data: readFileSync('dist/Skyfront.html') },
  ];
  const buf = makeZip(entries);
  writeFileSync('Skyfront-master.zip', buf);
  console.log(`✓ Skyfront-master.zip (${entries.length} Dateien · ${(buf.length / 1048576).toFixed(1)} MB) — nur Master, klein zum schnellen Teilen.`);
} else if (zip) {
  console.log('\n▶ packe dist/ → Skyfront-dist.zip …');
  const files = readdirSync('dist').filter(f => f.endsWith('.html')).sort();
  const variants = files.filter(f => f.startsWith('Skyfront-')).map(f => f.replace(/^Skyfront-/, '').replace(/\.html$/, ''));
  const readme =
`Skyfront — Spielepaket
=======================

Losspielen:
  * index.html im Browser öffnen und eine Variante wählen.
  * Oder direkt eine der Skyfront-*.html-Dateien öffnen (Doppelklick).

Alles läuft offline und ohne Installation. Wichtig: Die Dateien müssen
zusammen im selben Ordner bleiben, damit die Links im Menü funktionieren.

Enthaltene Fassungen (${variants.length}):
${variants.map(v => '  - ' + v).join('\n')}

Erstellt am ${new Date().toISOString().slice(0, 10)} mit build-all.mjs.
`;
  const entries = [{ name: 'README.txt', data: Buffer.from(readme, 'utf8') },
    ...files.map(f => ({ name: f, data: readFileSync('dist/' + f) }))];
  if (existsSync('dist/boot-report.txt')) entries.push({ name: 'boot-report.txt', data: readFileSync('dist/boot-report.txt') });
  const buf = makeZip(entries);
  writeFileSync('Skyfront-dist.zip', buf);
  console.log(`✓ Skyfront-dist.zip (${entries.length} Dateien · ${(buf.length / 1048576).toFixed(1)} MB) — Launcher (index.html) + README.txt + alle Varianten, direkt weitergebbar.`);
} else {
  console.log('\nHinweis: mit  node build-all.mjs --zip  entsteht zusätzlich ein verteilbares Skyfront-dist.zip  (oder --zip=master für nur die Master-Fassung).');
}
console.log('\n✓ Fertig.');

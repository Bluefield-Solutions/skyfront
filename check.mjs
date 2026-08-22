// CI-Check: baut Master + alle Varianten, startet jede headless und schreibt
// einen kurzen Markdown-Bericht (dist/check-report.md, auch auf stdout).
// Exit 0 = alles gut, sonst != 0. Ideal für Git-Hook / Pipeline / PR-Kommentar.
//   node check.mjs
// (Boot-Test braucht Playwright: `npm i playwright`. Ohne bleibt es bei der
//  Struktur-Prüfung — dann kann der Check keine Laufzeitfehler finden.)
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'fs';

function step(label, cmd) { console.log(`\n▶ ${label}`); execSync(cmd, { stdio: 'inherit' }); }

let ok = true;
try {
  if (existsSync('dist/boot-report.txt')) rmSync('dist/boot-report.txt');  // Stale-Schutz
  step('Build (Master)', 'node build.mjs');
  step('Build + Boot-Test aller Varianten', 'node build-variants.mjs --boot');
} catch { ok = false; }

const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
let md = `# Skyfront — Check-Report\n\n_${date}_\n\n`;

if (existsSync('dist/boot-report.txt')) {
  const lines = readFileSync('dist/boot-report.txt', 'utf8').split('\n').filter(l => /^[✓✗]/.test(l));
  md += '| Variante | Status | Fehler |\n|---|:--:|:--:|\n';
  let allBoot = true;
  for (const l of lines) {
    const good = l.startsWith('✓');
    if (!good) allBoot = false;
    const file = (l.match(/(Skyfront-[^\s]+\.html)/) || [])[1] || l.slice(2).trim();
    const errs = (l.match(/(\d+)\s*Fehler/) || [])[1] || '0';
    md += `| \`${file}\` | ${good ? '✅ gestartet' : '❌ Boot-Fehler'} | ${errs} |\n`;
  }
  ok = ok && allBoot;
  md += `\n**Ergebnis:** ${ok ? '✅ bestanden' : '❌ fehlgeschlagen'}\n`;
} else {
  md += (ok ? '✅ Alle Builds erzeugt. ' : '❌ Build fehlgeschlagen. ') +
    '_Boot-Test nicht gelaufen (Playwright nicht installiert) — nur Struktur-Prüfung._\n';
}

writeFileSync('dist/check-report.md', md);
console.log('\n' + md);
console.log(ok ? '✓ CHECK bestanden.' : '✗ CHECK fehlgeschlagen.');
process.exit(ok ? 0 : 1);
